import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { itemLibrarySchema, buildProperties } from '@/lib/validators/item-library'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = itemLibrarySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
  }

  const values = parsed.data
  const properties = buildProperties(values)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('item_library') as any)
    .update({
      name: values.name,
      description: values.description || null,
      category: values.category,
      rarity: values.rarity,
      base_price_gp: values.base_price_gp,
      weight_lbs: values.weight_lbs ?? null,
      is_magical: values.is_magical,
      attunement_required: values.attunement_required,
      cursed: values.cursed,
      shop_tags: values.shop_tags,
      properties,
      notes: values.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('dm_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { error } = await supabase
    .from('item_library')
    .delete()
    .eq('id', itemId)
    .eq('dm_id', user.id)

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data: { id: itemId }, error: null })
}
