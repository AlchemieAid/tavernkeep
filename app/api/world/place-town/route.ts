import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlaceTownSchema } from '@/lib/validators/world'
import { createAIClient } from '@/lib/ai'
import { buildWorldContext, buildEconomicContextForAI } from '@/lib/world/worldBuilder'
import { TOWN_FROM_ECONOMICS_SYSTEM_PROMPT, buildTownFromEconomicsPrompt } from '@/lib/prompts/townFromEconomics'
import type { ResourcePoint, TerrainArea, PlacedPoI } from '@/lib/world/resourceInterpolation'
import type { TownNode } from '@/lib/world/gravityModel'
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
    const parsed = PlaceTownSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { map_id, campaign_id, x_pct, y_pct, name_override } = parsed.data

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id, dm_id, map_size, biome_profile')
      .eq('id', map_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      return NextResponse.json(
        { data: null, error: { message: 'Map not found' } },
        { status: 404 }
      )
    }

    const [{ data: rawResourcePoints }, { data: rawTerrainAreas }, { data: rawPois }, { data: rawExistingTowns }] =
      await Promise.all([
        supabase.from('resource_points').select('*').eq('map_id', map_id),
        supabase.from('terrain_areas').select('*').eq('map_id', map_id),
        supabase.from('points_of_interest').select('*').eq('map_id', map_id),
        supabase.from('world_towns').select('id, x_pct, y_pct, wealth_score, town_tier, name').eq('map_id', map_id),
      ])

    const resourcePoints: ResourcePoint[] = (rawResourcePoints ?? []).map(rp => ({
      id: rp.id,
      x_pct: rp.x_pct,
      y_pct: rp.y_pct,
      resource_type: rp.resource_type,
      richness: rp.richness,
      influence_radius_pct: rp.influence_radius_pct ?? 0.08,
      name: rp.name ?? undefined,
    }))

    const terrainAreas: TerrainArea[] = (rawTerrainAreas ?? []).map(ta => ({
      id: ta.id,
      terrain_type: ta.terrain_type,
      polygon: ta.polygon as { x: number; y: number }[],
      computed_elevation_m: ta.computed_elevation_m ?? 0,
    }))

    const pois: PlacedPoI[] = (rawPois ?? []).map(poi => ({
      id: poi.id,
      x_pct: poi.x_pct,
      y_pct: poi.y_pct,
      poi_type: poi.poi_type,
    }))

    const existingTowns: TownNode[] = (rawExistingTowns ?? []).map(t => ({
      id: t.id,
      x_pct: t.x_pct,
      y_pct: t.y_pct,
      wealth_score: t.wealth_score ?? 0,
      town_tier: (t.town_tier ?? 'hamlet') as TownNode['town_tier'],
      name: t.name ?? null,
    }))

    const worldContext = buildWorldContext({
      qx: x_pct,
      qy: y_pct,
      resourcePoints,
      terrainAreas,
      pois,
      existingTowns,
      biome_profile: map.biome_profile ?? undefined,
      map_size: (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
    })

    const economicContextText = buildEconomicContextForAI(worldContext)

    const ai = createAIClient()
    const aiResponse = await ai.generate({
      messages: [
        { role: 'system', content: TOWN_FROM_ECONOMICS_SYSTEM_PROMPT },
        { role: 'user', content: buildTownFromEconomicsPrompt(economicContextText) },
      ],
      responseFormat: 'json',
      temperature: 0.85,
    })

    let aiTown: {
      name: string
      description: string
      history: string
      notable_character: string
      local_tension: string
    }
    try {
      aiTown = JSON.parse(aiResponse.content)
    } catch {
      return NextResponse.json(
        { data: null, error: { message: 'AI returned invalid town data' } },
        { status: 502 }
      )
    }

    const { economic } = worldContext
    const { data: newTown, error: townInsertError } = await supabase
      .from('world_towns')
      .insert({
        map_id,
        campaign_id,
        dm_id: user.id,
        x_pct,
        y_pct,
        name: name_override ?? aiTown.name,
        population_est: Math.floor(
          (economic.population_range.min + economic.population_range.max) / 2
        ),
        wealth_score: economic.wealth_score,
        town_tier: economic.town_tier,
        specializations: economic.specializations,
        trade_partners: economic.trade_partners as unknown as Json,
        price_index: economic.price_index as unknown as Json,
        resource_snapshot: worldContext.geographic.resource.scores as unknown as Json,
        economic_context: { text: economicContextText, ...aiTown } as unknown as Json,
      })
      .select()
      .single()

    if (townInsertError || !newTown) {
      return NextResponse.json(
        { data: null, error: { message: `Failed to save town: ${townInsertError?.message}` } },
        { status: 500 }
      )
    }

    await supabase.from('points_of_interest').insert({
      map_id,
      campaign_id,
      dm_id: user.id,
      x_pct,
      y_pct,
      poi_category: 'settlement',
      poi_type: economic.town_tier === 'hamlet' ? 'hamlet'
        : economic.town_tier === 'village' ? 'village'
        : economic.town_tier === 'city' || economic.town_tier === 'metropolis' ? 'city'
        : 'town',
      name: name_override ?? aiTown.name,
      linked_town_id: newTown.id,
      is_visible_to_players: false,
    })

    return NextResponse.json({
      data: { town: newTown, ai_description: aiTown, world_context: worldContext },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
