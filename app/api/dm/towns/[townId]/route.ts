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

    // If ruler_id is provided, fetch the notable person's name to update ruler field
    let updateData = { ...validation.data }
    if (validation.data.ruler_id) {
      const { data: notablePerson } = await supabase
        .from('notable_people')
        .select('name')
        .eq('id', validation.data.ruler_id)
        .single()
      
      if (notablePerson) {
        updateData.ruler = notablePerson.name
      }
    } else if (validation.data.ruler_id === null) {
      // If ruler_id is explicitly set to null, clear the ruler name too
      updateData.ruler = null
    }

    const { data: town, error } = await supabase
      .from('towns')
      .update(updateData as any)
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
