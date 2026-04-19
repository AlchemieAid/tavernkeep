import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/lib/supabase/database.types'

const PolygonPointSchema = z.object({ x: z.number(), y: z.number() })

const PlaceTerritorySchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  faction: z.string().max(120).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  polygon: z.array(PolygonPointSchema).min(3),
  law_level: z.enum(['lawless', 'low', 'moderate', 'high', 'strict']).nullable().optional(),
  attitude_to_strangers: z.enum(['hostile', 'suspicious', 'neutral', 'friendly', 'welcoming']).nullable().optional(),
  patrol_intensity: z.enum(['none', 'light', 'moderate', 'heavy', 'militarized']).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const body = await request.json()
    const parsed = PlaceTerritorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
    }

    const { map_id, campaign_id, name, faction, color, polygon, law_level, attitude_to_strangers, patrol_intensity, notes } = parsed.data

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

    const { data: territory, error } = await supabase
      .from('political_territories')
      .insert({
        map_id,
        campaign_id,
        dm_id: user.id,
        name,
        faction: faction ?? null,
        color: color ?? '#3b82f6',
        polygon: polygon as unknown as Json,
        law_level: law_level ?? null,
        attitude_to_strangers: attitude_to_strangers ?? null,
        patrol_intensity: patrol_intensity ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data: territory, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
