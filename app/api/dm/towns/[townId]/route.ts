import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ townId: string }> }
) {
  const { townId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const { data: town, error } = await supabase
    .from('towns')
    .select('*')
    .eq('id', townId)
    .eq('dm_id', user.id)
    .single()

  if (error) {
    return NextResponse.json(
      { error: { message: 'Town not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: town })
}
