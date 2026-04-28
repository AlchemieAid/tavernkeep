import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MapSettingsSchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  wealth_floor: z.number().min(0).max(1),
  wealth_ceiling: z.number().min(0).max(1),
}).refine(data => data.wealth_floor < data.wealth_ceiling, {
  message: 'Minimum prosperity must be lower than maximum prosperity',
  path: ['wealth_floor'],
})

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const body = await request.json()
    const parsed = MapSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
    }

    const { map_id, campaign_id, wealth_floor, wealth_ceiling } = parsed.data

    const { data, error } = await supabase
      .from('campaign_maps')
      .update({ wealth_floor, wealth_ceiling })
      .eq('id', map_id)
      .eq('campaign_id', campaign_id)
      .eq('dm_id', user.id)
      .select('id, wealth_floor, wealth_ceiling')
      .single()

    if (error || !data) {
      return NextResponse.json({ data: null, error: { message: error?.message ?? 'Map not found' } }, { status: 404 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
