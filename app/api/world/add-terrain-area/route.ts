import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/lib/supabase/database.types'

const PolygonPointSchema = z.object({ x: z.number(), y: z.number() })

const AddTerrainAreaSchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  terrain_type: z.string().min(1),
  polygon: z.array(PolygonPointSchema).min(3),
  computed_elevation_m: z.number().nullable().optional(),
  climate_zone: z.string().max(60).nullable().optional(),
  atmosphere_text: z.string().max(500).nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const body = await request.json()
    const parsed = AddTerrainAreaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
    }

    const { map_id, campaign_id, terrain_type, polygon, computed_elevation_m, climate_zone, atmosphere_text } = parsed.data

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id')
      .eq('id', map_id)
      .eq('campaign_id', campaign_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      return NextResponse.json({ data: null, error: { message: 'Map not found' } }, { status: 404 })
    }

    const { data: area, error } = await supabase
      .from('terrain_areas')
      .insert({
        map_id,
        terrain_type,
        polygon: polygon as unknown as Json,
        computed_elevation_m: computed_elevation_m ?? null,
        climate_zone: climate_zone ?? null,
        atmosphere_text: atmosphere_text ?? null,
        placed_by: 'dm',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data: area, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
