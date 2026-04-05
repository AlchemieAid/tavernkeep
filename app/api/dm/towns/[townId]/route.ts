import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateTownSchema } from '@/lib/validators/town'

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ townId: string }> }
) {
  try {
    const { townId } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const validation = UpdateTownSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid input', details: validation.error.errors } },
        { status: 400 }
      )
    }

    const { data: town, error } = await supabase
      .from('towns')
      .update(validation.data as any)
      .eq('id', townId)
      .eq('dm_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: 'Failed to update town' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: town })
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
