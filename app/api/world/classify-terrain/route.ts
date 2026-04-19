import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClassifyTerrainSchema } from '@/lib/validators/world'
import { createAIClient } from '@/lib/ai'
import {
  TERRAIN_SYSTEM_PROMPT,
  buildTerrainClassificationUserPrompt,
} from '@/lib/prompts/terrainClassification'
import { TERRAIN_ELEVATION_RANGES, terrainMidpointElevation } from '@/lib/world/elevation'
import type { Json } from '@/lib/supabase/database.types'

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
    const parsed = ClassifyTerrainSchema.safeParse(body)
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

    const ai = createAIClient('openai')

    const userPrompt = buildTerrainClassificationUserPrompt(
      (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
      map.biome_profile ?? undefined
    )

    const response = await (ai as { generate: (params: object) => Promise<{ content: string }> }).generate({
      messages: [
        { role: 'system', content: TERRAIN_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: image_url } },
          ],
        },
      ],
      responseFormat: 'json',
      temperature: 0.3,
    })

    let terrainAreas: unknown[]
    try {
      terrainAreas = JSON.parse(response.content)
      if (!Array.isArray(terrainAreas)) throw new Error('Expected array')
    } catch {
      return NextResponse.json(
        { data: null, error: { message: 'AI returned invalid terrain data' } },
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

    await supabase.from('terrain_areas').delete().eq('map_id', map_id).eq('placed_by', 'ai')

    const { data: inserted, error: insertError } = await supabase
      .from('terrain_areas')
      .insert(insertRows)
      .select()

    if (insertError) {
      return NextResponse.json(
        { data: null, error: { message: `Failed to save terrain: ${insertError.message}` } },
        { status: 500 }
      )
    }

    await supabase
      .from('campaign_maps')
      .update({ setup_stage: 'terrain_classified' })
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
