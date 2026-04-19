import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GenerateAtmosphereSchema } from '@/lib/validators/world'
import { createAIClient } from '@/lib/ai'
import { ATMOSPHERE_SYSTEM_PROMPT, buildAtmospherePrompt } from '@/lib/prompts/generateAtmosphere'
import { deriveEcosystem } from '@/lib/world/ecosystem'
import type { ClimateZone } from '@/lib/world/climate'

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
    const parsed = GenerateAtmosphereSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { terrain_area_id, map_id } = parsed.data

    const { data: area, error: areaError } = await supabase
      .from('terrain_areas')
      .select(`
        id, terrain_type, computed_elevation_m,
        climate_zone, temp_summer_high_c, temp_winter_low_c, annual_rainfall_mm,
        ecosystem_flora, ecosystem_fauna, hazards, atmosphere_text
      `)
      .eq('id', terrain_area_id)
      .single()

    if (areaError || !area) {
      return NextResponse.json(
        { data: null, error: { message: 'Terrain area not found' } },
        { status: 404 }
      )
    }

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('dm_id')
      .eq('id', map_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      return NextResponse.json(
        { data: null, error: { message: 'Map not found or access denied' } },
        { status: 404 }
      )
    }

    if (area.atmosphere_text) {
      return NextResponse.json({ data: { atmosphere_text: area.atmosphere_text }, error: null })
    }

    const elevation_m = area.computed_elevation_m ?? 0
    const climate_zone = area.climate_zone ?? 'temperate_continental'

    let flora = (area.ecosystem_flora as string[] | null) ?? []
    let fauna = (area.ecosystem_fauna as string[] | null) ?? []

    if (flora.length === 0 || fauna.length === 0) {
      const eco = deriveEcosystem({ terrain_type: area.terrain_type, climate_zone: climate_zone as ClimateZone, elevation_m })
      flora = flora.length > 0 ? flora : eco.flora
      fauna = fauna.length > 0 ? fauna : eco.fauna
    }

    const hazards = area.hazards as Array<{ type: string }> | null
    const hazardLabels = (hazards ?? []).map(h => h.type)

    const ai = createAIClient()
    const aiResponse = await ai.generate({
      messages: [
        { role: 'system', content: ATMOSPHERE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildAtmospherePrompt({
            terrain_type: area.terrain_type,
            elevation_m,
            climate_zone,
            temp_summer_high_c: area.temp_summer_high_c ?? 18,
            temp_winter_low_c: area.temp_winter_low_c ?? 2,
            annual_rainfall_mm: area.annual_rainfall_mm ?? 700,
            top_3_flora: flora.slice(0, 3),
            top_3_fauna: fauna.slice(0, 3),
            hazards: hazardLabels,
          }),
        },
      ],
      temperature: 0.9,
    })

    const atmosphere_text = aiResponse.content.trim()

    await supabase
      .from('terrain_areas')
      .update({
        atmosphere_text,
        atmosphere_generated_at: new Date().toISOString(),
      })
      .eq('id', terrain_area_id)

    return NextResponse.json({ data: { atmosphere_text }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
