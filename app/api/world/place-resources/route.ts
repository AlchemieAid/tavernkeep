import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlaceResourcesSchema } from '@/lib/validators/world'
import { createAIClient } from '@/lib/ai'
import {
  RESOURCE_PLACEMENT_SYSTEM_PROMPT,
  buildResourcePlacementUserPrompt,
} from '@/lib/prompts/resourcePointPlacement'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = PlaceResourcesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { map_id, image_url } = parsed.data

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id, dm_id, map_size, biome_profile, setup_stage')
      .eq('id', map_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      return NextResponse.json(
        { data: null, error: { message: 'Map not found' } },
        { status: 404 }
      )
    }

    const { data: terrainAreas } = await supabase
      .from('terrain_areas')
      .select('terrain_type, computed_elevation_m')
      .eq('map_id', map_id)

    const terrain_summary = (terrainAreas ?? [])
      .map(t => `${t.terrain_type} (~${Math.round(t.computed_elevation_m ?? 0)}m)`)
      .join(', ')

    const ai = createAIClient('openai')

    const userPrompt = buildResourcePlacementUserPrompt({
      map_size: (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
      terrain_summary: terrain_summary || 'mixed terrain',
    })

    const response = await (ai as { generate: (params: object) => Promise<{ content: string }> }).generate({
      messages: [
        { role: 'system', content: RESOURCE_PLACEMENT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: image_url } },
          ],
        },
      ],
      responseFormat: 'json',
      temperature: 0.4,
    })

    let resourcePoints: unknown[]
    try {
      resourcePoints = JSON.parse(response.content)
      if (!Array.isArray(resourcePoints)) throw new Error('Expected array')
    } catch {
      return NextResponse.json(
        { data: null, error: { message: 'AI returned invalid resource data' } },
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

    await supabase.from('resource_points').delete().eq('map_id', map_id).eq('placed_by', 'ai')

    const { data: inserted, error: insertError } = await supabase
      .from('resource_points')
      .insert(insertRows)
      .select()

    if (insertError) {
      return NextResponse.json(
        { data: null, error: { message: `Failed to save resources: ${insertError.message}` } },
        { status: 500 }
      )
    }

    await supabase
      .from('campaign_maps')
      .update({ setup_stage: 'resources_placed' })
      .eq('id', map_id)

    return NextResponse.json({ data: inserted, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
