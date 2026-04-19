import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  eventId: z.string().uuid(),
  mapId: z.string().uuid(),
  is_known_to_players: z.boolean().optional(),
})

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
  }

  const { eventId, mapId, ...updates } = parsed.data

  const { data: mapRow } = await supabase
    .from('campaign_maps')
    .select('id')
    .eq('id', mapId)
    .eq('dm_id', user.id)
    .single()

  if (!mapRow) return NextResponse.json({ data: null, error: { message: 'Map not found or not owned' } }, { status: 403 })

  const { data, error } = await supabase
    .from('historical_events')
    .update(updates)
    .eq('id', eventId)
    .eq('map_id', mapId)
    .select('id, is_known_to_players')
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}
