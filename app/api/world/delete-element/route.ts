import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const TABLE_MAP = {
  poi: 'points_of_interest',
  world_town: 'world_towns',
  territory: 'political_territories',
  historical_event: 'historical_events',
  trade_route: 'trade_routes',
  terrain_area: 'terrain_areas',
  resource_point: 'resource_points',
} as const

const schema = z.object({
  type: z.enum(['poi', 'world_town', 'territory', 'historical_event', 'trade_route', 'terrain_area', 'resource_point']),
  elementId: z.string().uuid(),
  mapId: z.string().uuid(),
})

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
  }

  const { type, elementId, mapId } = parsed.data

  // Verify map ownership
  const { data: mapRow } = await supabase
    .from('campaign_maps')
    .select('id')
    .eq('id', mapId)
    .eq('dm_id', user.id)
    .single()

  if (!mapRow) return NextResponse.json({ data: null, error: { message: 'Map not found or not owned' } }, { status: 403 })

  const table = TABLE_MAP[type]

  const { error } = await supabase
    .from(table as 'points_of_interest')
    .delete()
    .eq('id', elementId)
    .eq('map_id', mapId)

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })

  return NextResponse.json({ data: { deleted: true }, error: null })
}
