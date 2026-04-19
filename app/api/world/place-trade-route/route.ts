import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/lib/supabase/database.types'

const PlaceTradeRouteSchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  town_a_id: z.string().uuid(),
  town_b_id: z.string().uuid(),
  primary_goods: z.array(z.string()).optional().default([]),
  trade_volume: z.number().min(0).max(10).optional().default(5),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const body = await request.json()
    const parsed = PlaceTradeRouteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
    }

    const { map_id, campaign_id, town_a_id, town_b_id, primary_goods, trade_volume } = parsed.data

    if (town_a_id === town_b_id) {
      return NextResponse.json({ data: null, error: { message: 'Cannot create a route between the same town' } }, { status: 400 })
    }

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

    const { count: townCount } = await supabase
      .from('world_towns')
      .select('id', { count: 'exact', head: true })
      .eq('map_id', map_id)
      .in('id', [town_a_id, town_b_id])

    if (townCount !== 2) {
      return NextResponse.json({ data: null, error: { message: 'One or both towns not found on this map' } }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('trade_routes')
      .select('id')
      .eq('map_id', map_id)
      .or(`and(town_a_id.eq.${town_a_id},town_b_id.eq.${town_b_id}),and(town_a_id.eq.${town_b_id},town_b_id.eq.${town_a_id})`)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ data: null, error: { message: 'A trade route between these towns already exists' } }, { status: 409 })
    }

    const { data: route, error } = await supabase
      .from('trade_routes')
      .insert({
        map_id,
        town_a_id,
        town_b_id,
        primary_goods,
        trade_volume,
        path_points: null as Json,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data: route, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
