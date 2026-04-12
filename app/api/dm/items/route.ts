import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { itemLibrarySchema, buildProperties } from '@/lib/validators/item-library'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const shopTag = searchParams.get('shop_tag')
  const search = searchParams.get('q')

  let query = supabase
    .from('item_library')
    .select('*')
    .eq('dm_id', user.id)
    .order('name', { ascending: true })

  if (category) query = query.eq('category', category)
  if (shopTag) query = query.contains('shop_tags', [shopTag])
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
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

  const { data, error } = await supabase
    .from('item_library')
    .insert({
      dm_id: user.id,
      name: values.name,
      description: values.description || null,
      ruleset: values.ruleset,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}
