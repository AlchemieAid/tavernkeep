import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlaceResourcesSchema } from '@/lib/validators/world'
import OpenAI from 'openai'
import {
  RESOURCE_PLACEMENT_SYSTEM_PROMPT,
  buildResourcePlacementUserPrompt,
} from '@/lib/prompts/resourcePointPlacement'

export const maxDuration = 60

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('[RESOURCES] place-resources called at', new Date().toISOString())

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[RESOURCES] Unauthorized request')
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[RESOURCES] Request body keys:', Object.keys(body), '| image_url length:', (body.image_url as string)?.length)

    const parsed = PlaceResourcesSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[RESOURCES] Validation failed:', parsed.error.issues)
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { map_id, image_url } = parsed.data
    const isDataUrl = image_url.startsWith('data:')
    console.log('[RESOURCES] map_id:', map_id, '| image_url type:', isDataUrl ? 'data-url' : 'http-url')

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id, dm_id, map_size, biome_profile, setup_stage')
      .eq('id', map_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      console.error('[RESOURCES] Map not found:', mapError?.message)
      return NextResponse.json(
        { data: null, error: { message: 'Map not found' } },
        { status: 404 }
      )
    }
    console.log('[RESOURCES] Map found:', { map_size: map.map_size, biome_profile: map.biome_profile, setup_stage: map.setup_stage })

    const { data: terrainAreas } = await supabase
      .from('terrain_areas')
      .select('terrain_type, computed_elevation_m')
      .eq('map_id', map_id)

    const terrain_summary = (terrainAreas ?? [])
      .map(t => `${t.terrain_type} (~${Math.round(t.computed_elevation_m ?? 0)}m)`)
      .join(', ')
    console.log('[RESOURCES] Terrain summary from', terrainAreas?.length ?? 0, 'areas:', terrain_summary.slice(0, 120))

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[RESOURCES] OPENAI_API_KEY not configured')
      return NextResponse.json(
        { data: null, error: { message: 'AI vision service not configured (missing OPENAI_API_KEY)' } },
        { status: 503 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const userPrompt = buildResourcePlacementUserPrompt({
      map_size: (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
      terrain_summary: terrain_summary || 'mixed terrain',
    })
    console.log('[RESOURCES] User prompt length:', userPrompt.length, '| sending to GPT-4o vision')

    const aiStart = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: RESOURCE_PLACEMENT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: image_url, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 8192,
    })
    const aiDuration = Date.now() - aiStart
    const choice = completion.choices[0]
    console.log('[RESOURCES] AI response took', aiDuration, 'ms | tokens:', completion.usage?.total_tokens, '| finish_reason:', choice.finish_reason)

    if (!choice.message.content) {
      const reason = choice.finish_reason
      const isFilter = reason === 'content_filter'
      console.error('[RESOURCES] AI returned null content. finish_reason:', reason)
      return NextResponse.json(
        {
          data: null,
          error: {
            message: isFilter
              ? 'The AI declined to analyze this image due to content policy. Try regenerating the map with different settings.'
              : `AI returned no content (finish_reason: ${reason}). Try again.`,
          },
        },
        { status: 502 }
      )
    }

    const rawContent = choice.message.content
    console.log('[RESOURCES] Raw AI response length:', rawContent.length, '| preview:', rawContent.slice(0, 200))

    let resourcePoints: unknown[]
    try {
      const parsed = JSON.parse(rawContent)
      // AI may return { resource_points: [...] } or directly [...]
      resourcePoints = Array.isArray(parsed) ? parsed : (parsed.resource_points ?? parsed.points ?? parsed.resources ?? [])
      if (!Array.isArray(resourcePoints)) throw new Error('No array found in response')
      console.log('[RESOURCES] Parsed', resourcePoints.length, 'resource points')
    } catch (parseErr) {
      console.error('[RESOURCES] Failed to parse AI response:', parseErr, '| raw:', rawContent.slice(0, 500))
      return NextResponse.json(
        { data: null, error: { message: 'AI returned invalid resource data — please try again' } },
        { status: 502 }
      )
    }

    const insertRows = (resourcePoints as Array<{
      x_pct: number
      y_pct: number
      resource_type: string
      richness: number
      name?: string | null
      influence_radius_pct?: number
    }>).map(pt => ({
      map_id,
      x_pct: Math.max(0, Math.min(1, pt.x_pct)),
      y_pct: Math.max(0, Math.min(1, pt.y_pct)),
      resource_type: pt.resource_type,
      richness: Math.max(0.1, Math.min(1.0, pt.richness)),
      name: pt.name ?? null,
      influence_radius_pct: pt.influence_radius_pct ?? 0.08,
      placed_by: 'ai' as const,
    }))

    console.log('[RESOURCES] Deleting existing AI resource points for map:', map_id)
    await supabase.from('resource_points').delete().eq('map_id', map_id).eq('placed_by', 'ai')

    console.log('[RESOURCES] Inserting', insertRows.length, 'resource rows')
    const { data: inserted, error: insertError } = await supabase
      .from('resource_points')
      .insert(insertRows)
      .select()

    if (insertError) {
      console.error('[RESOURCES] DB insert failed:', insertError)
      return NextResponse.json(
        { data: null, error: { message: `Failed to save resources: ${insertError.message}` } },
        { status: 500 }
      )
    }

    await supabase
      .from('campaign_maps')
      .update({ setup_stage: 'resources_placed' })
      .eq('id', map_id)

    const totalDuration = Date.now() - startTime
    console.log('[RESOURCES] Complete. Inserted', inserted?.length, 'resource points in', totalDuration, 'ms')

    return NextResponse.json({ data: inserted, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[RESOURCES] Unhandled error after', Date.now() - startTime, 'ms:', message, err)
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
