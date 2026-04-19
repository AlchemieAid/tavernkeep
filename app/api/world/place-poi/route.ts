import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PlacePoISchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  poi_type: z.string().min(1),
  poi_category: z.string().min(1),
  x_pct: z.number().min(0).max(1).optional().default(0.5),
  y_pct: z.number().min(0).max(1).optional().default(0.5),
  name: z.string().nullable().optional(),
  player_hint: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const body = await request.json()
    const parsed = PlacePoISchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { map_id, campaign_id, poi_type, poi_category, x_pct, y_pct, name, player_hint, description } = parsed.data

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

    const { data: poi, error: insertError } = await supabase
      .from('points_of_interest')
      .insert({
        map_id,
        campaign_id,
        dm_id: user.id,
        poi_type,
        poi_category,
        x_pct,
        y_pct,
        name: name ?? null,
        player_hint: player_hint ?? null,
        description: description ?? null,
        is_discovered: false,
        is_visible_to_players: false,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { data: null, error: { message: insertError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: poi, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
