import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClassifyTerrainSchema } from '@/lib/validators/world'
import OpenAI from 'openai'
import {
  TERRAIN_SYSTEM_PROMPT,
  buildTerrainClassificationUserPrompt,
} from '@/lib/prompts/terrainClassification'
import { TERRAIN_ELEVATION_RANGES, terrainMidpointElevation } from '@/lib/world/elevation'
import type { Json } from '@/lib/supabase/database.types'

export const maxDuration = 60

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('[TERRAIN] classify-terrain called at', new Date().toISOString())

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[TERRAIN] Unauthorized request')
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[TERRAIN] Request body keys:', Object.keys(body), '| image_url length:', (body.image_url as string)?.length)

    const parsed = ClassifyTerrainSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[TERRAIN] Validation failed:', parsed.error.issues)
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { map_id, image_url } = parsed.data
    const isDataUrl = image_url.startsWith('data:')
    console.log('[TERRAIN] map_id:', map_id, '| image_url type:', isDataUrl ? 'data-url' : 'http-url', '| length:', image_url.length)

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id, dm_id, map_size, biome_profile, setup_stage')
      .eq('id', map_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      console.error('[TERRAIN] Map not found:', mapError?.message)
      return NextResponse.json(
        { data: null, error: { message: 'Map not found' } },
        { status: 404 }
      )
    }

    console.log('[TERRAIN] Map found:', { map_size: map.map_size, biome_profile: map.biome_profile, setup_stage: map.setup_stage })

    // Terrain classification requires vision (image analysis).
    // Always use OpenAI GPT-4o which has proven vision support for this structured task.
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[TERRAIN] OPENAI_API_KEY not configured')
      return NextResponse.json(
        { data: null, error: { message: 'AI vision service not configured (missing OPENAI_API_KEY)' } },
        { status: 503 }
      )
    }

    const openai = new OpenAI({ apiKey })
    console.log('[TERRAIN] Using OpenAI GPT-4o for vision-based terrain classification')

    const userPrompt = buildTerrainClassificationUserPrompt(
      (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
      map.biome_profile ?? undefined
    )
    console.log('[TERRAIN] User prompt length:', userPrompt.length)

    // OpenAI accepts both HTTP URLs and data URLs (base64 inline) for vision
    // Gemini images arrive as data: URIs, which OpenAI handles natively
    console.log('[TERRAIN] Sending image to GPT-4o vision:', isDataUrl ? `data URI (${image_url.length} chars)` : image_url)

    const aiStart = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TERRAIN_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: image_url, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4096,
    })
    const aiDuration = Date.now() - aiStart
    const choice = completion.choices[0]
    console.log('[TERRAIN] AI response took', aiDuration, 'ms | tokens used:', completion.usage?.total_tokens, '| finish_reason:', choice.finish_reason)

    if (!choice.message.content) {
      const reason = choice.finish_reason
      const isFilter = reason === 'content_filter'
      console.error('[TERRAIN] AI returned null content. finish_reason:', reason)
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
    console.log('[TERRAIN] Raw AI response length:', rawContent.length, '| preview:', rawContent.slice(0, 200))

    let terrainAreas: unknown[]
    try {
      const parsed = JSON.parse(rawContent)
      // Prompt returns { terrain_areas: [...] }; guard against bare arrays too
      terrainAreas = Array.isArray(parsed) ? parsed : (parsed.terrain_areas ?? parsed.areas ?? parsed.zones ?? [])
      if (!Array.isArray(terrainAreas)) throw new Error('No array found in response')
      console.log('[TERRAIN] Parsed', terrainAreas.length, 'terrain areas')
    } catch (parseErr) {
      console.error('[TERRAIN] Failed to parse AI response:', parseErr, '| raw:', rawContent.slice(0, 500))
      return NextResponse.json(
        { data: null, error: { message: 'AI returned invalid terrain data — please try again' } },
        { status: 502 }
      )
    }

    const insertRows = (terrainAreas as Array<{
      terrain_type: string
      polygon: object
      elevation_min_m?: number
      elevation_max_m?: number
      computed_elevation_m?: number
    }>).map(area => {
      const range = TERRAIN_ELEVATION_RANGES[area.terrain_type]
      return {
        map_id,
        terrain_type: area.terrain_type,
        polygon: area.polygon as unknown as Json,
        elevation_min_m: area.elevation_min_m ?? range?.min ?? 0,
        elevation_max_m: area.elevation_max_m ?? range?.max ?? 0,
        computed_elevation_m: area.computed_elevation_m ?? terrainMidpointElevation(area.terrain_type),
        placed_by: 'ai' as const,
      }
    })

    console.log('[TERRAIN] Deleting existing AI terrain areas for map:', map_id)
    await supabase.from('terrain_areas').delete().eq('map_id', map_id).eq('placed_by', 'ai')

    console.log('[TERRAIN] Inserting', insertRows.length, 'terrain rows')
    const { data: inserted, error: insertError } = await supabase
      .from('terrain_areas')
      .insert(insertRows)
      .select()

    if (insertError) {
      console.error('[TERRAIN] DB insert failed:', insertError)
      return NextResponse.json(
        { data: null, error: { message: `Failed to save terrain: ${insertError.message}` } },
        { status: 500 }
      )
    }

    await supabase
      .from('campaign_maps')
      .update({ setup_stage: 'terrain_classified' })
      .eq('id', map_id)

    const totalDuration = Date.now() - startTime
    console.log('[TERRAIN] Complete. Inserted', inserted?.length, 'terrain areas in', totalDuration, 'ms')

    return NextResponse.json({ data: inserted, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[TERRAIN] Unhandled error after', Date.now() - startTime, 'ms:', message, err)
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
