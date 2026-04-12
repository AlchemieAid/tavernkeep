import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateNotablePersonSchema } from '@/lib/validators/notable-person'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const validation = UpdateNotablePersonSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Invalid input', details: validation.error.errors } },
        { status: 400 }
      )
    }

    const { data: person, error } = await supabase
      .from('notable_people')
      .update(validation.data as any)
      .eq('id', personId)
      .eq('dm_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: 'Failed to update notable person' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: person })
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
