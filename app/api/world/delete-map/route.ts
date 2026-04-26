import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mapId } = await request.json()
  if (!mapId) return NextResponse.json({ error: 'mapId required' }, { status: 400 })

  const { error } = await supabase
    .from('campaign_maps')
    .delete()
    .eq('id', mapId)
    .eq('dm_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
