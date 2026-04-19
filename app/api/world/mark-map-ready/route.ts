import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const { map_id, campaign_id } = await request.json() as { map_id: string; campaign_id: string }
    if (!map_id || !campaign_id) {
      return NextResponse.json({ data: null, error: { message: 'map_id and campaign_id required' } }, { status: 400 })
    }

    const { data: map, error: lookupError } = await supabase
      .from('campaign_maps')
      .select('id, setup_stage')
      .eq('id', map_id)
      .eq('campaign_id', campaign_id)
      .eq('dm_id', user.id)
      .single()

    if (lookupError || !map) {
      return NextResponse.json({ data: null, error: { message: 'Map not found' } }, { status: 404 })
    }

    if (map.setup_stage === 'ready') {
      return NextResponse.json({ data: map, error: null })
    }

    const { data: updated, error } = await supabase
      .from('campaign_maps')
      .update({ setup_stage: 'ready' })
      .eq('id', map_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data: updated, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
