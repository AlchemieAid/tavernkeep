import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlaceResourcesSchema } from '@/lib/validators/world'
import { createAIClient } from '@/lib/ai'
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
    const { map_id } = parsed.data
    console.log('[RESOURCES] map_id:', map_id)

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

    // Fetch terrain areas with polygon data so we can compute centroids for richer prompting
    const { data: terrainAreas } = await supabase
      .from('terrain_areas')
      .select('terrain_type, computed_elevation_m, polygon')
      .eq('map_id', map_id)

    // Compute centroid of each terrain polygon to tell the AI WHERE each terrain is on the map
    const terrainDetail = (terrainAreas ?? []).map(t => {
      const poly = Array.isArray(t.polygon) ? (t.polygon as Array<{ x: number; y: number }>) : []
      const cx = poly.length > 0 ? (poly.reduce((s, p) => s + p.x, 0) / poly.length).toFixed(2) : '?'
      const cy = poly.length > 0 ? (poly.reduce((s, p) => s + p.y, 0) / poly.length).toFixed(2) : '?'
      return `${t.terrain_type} at (${cx},${cy}) elev~${Math.round(t.computed_elevation_m ?? 0)}m`
    })
    const terrain_summary = terrainDetail.join('\n')
    console.log('[RESOURCES] Terrain detail from', terrainAreas?.length ?? 0, 'areas (first 3):', terrainDetail.slice(0, 3).join(' | '))

    const ai = createAIClient()

    const userPrompt = buildResourcePlacementUserPrompt({
      map_size: (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
      terrain_summary: terrain_summary || 'mixed terrain',
    })
    console.log('[RESOURCES] User prompt length:', userPrompt.length, '| calling AI text-only')

    const aiStart = Date.now()
    const aiResponse = await ai.generate({
      messages: [
        { role: 'system', content: RESOURCE_PLACEMENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: 'json',
      temperature: 0.4,
    })
    const aiDuration = Date.now() - aiStart
    console.log('[RESOURCES] AI response took', aiDuration, 'ms | content length:', aiResponse.content?.length)

    if (!aiResponse.content) {
      console.error('[RESOURCES] AI returned empty content')
      return NextResponse.json(
        { data: null, error: { message: 'AI returned no content — please try again' } },
        { status: 502 }
      )
    }

    // Strip markdown code fences if present (some models wrap JSON in ```json ... ```)
    const stripped = aiResponse.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const rawContent = stripped
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
