import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const itemSchema = z.object({
  shop_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.enum(['weapon', 'armor', 'potion', 'scroll', 'tool', 'magic_item', 'misc']),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'legendary']),
  base_price_gp: z.number().int().min(0),
  stock_quantity: z.number().int().min(1).default(1),
  weight_lbs: z.number().nullable().optional(),
  is_hidden: z.boolean().default(false),
  is_revealed: z.boolean().default(true),
  hidden_condition: z.string().nullable().optional(),
  attunement_required: z.boolean().default(false),
  cursed: z.boolean().default(false),
  identified: z.boolean().default(true),
  properties: z.record(z.unknown()).nullable().optional(),
  source: z.string().default('library'),
  currency_reference: z.string().default('gp'),
})

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Verify DM owns the shop
  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('id', shopId)
    .eq('dm_id', user.id)
    .single()

  if (!shop) return NextResponse.json({ data: null, error: { message: 'Shop not found' } }, { status: 404 })

  const body: unknown = await request.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('items')
    .insert(parsed.data.items as any)
    .select()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}
