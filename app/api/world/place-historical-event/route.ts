import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PlaceHistoricalEventSchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  event_name: z.string().min(1).max(200),
  event_type: z.enum(['battle', 'disaster', 'founding', 'treaty', 'discovery', 'plague', 'miracle', 'conquest', 'collapse', 'other']).nullable().optional(),
  x_pct: z.number().min(0).max(1),
  y_pct: z.number().min(0).max(1),
  years_ago: z.number().int().min(0).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  lingering_effect: z.string().max(1000).nullable().optional(),
  is_known_to_players: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const body = await request.json()
    const parsed = PlaceHistoricalEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
    }

    const { map_id, campaign_id, event_name, event_type, x_pct, y_pct, years_ago, description, lingering_effect, is_known_to_players } = parsed.data

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

    const { data: event, error } = await supabase
      .from('historical_events')
      .insert({
        map_id,
        campaign_id,
        dm_id: user.id,
        event_name,
        event_type: event_type ?? null,
        x_pct,
        y_pct,
        years_ago: years_ago ?? null,
        description: description ?? null,
        lingering_effect: lingering_effect ?? null,
        is_known_to_players: is_known_to_players ?? false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data: event, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
