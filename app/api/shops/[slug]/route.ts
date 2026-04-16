/**
 * Public Shop API Route
 * @route GET /api/shops/[slug]
 * @auth Not required - Public access
 * @description Fetches shop and visible items for player browsing. Filters hidden items and out-of-stock.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (shopError || !shop) {
    return NextResponse.json(
      { data: null, error: { message: 'Shop not found' } },
      { status: 404 }
    )
  }

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('shop_id', shop.id)
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .gt('stock_quantity', 0)
    .order('rarity', { ascending: false })
    .order('name', { ascending: true })

  if (itemsError) {
    return NextResponse.json(
      { data: null, error: { message: 'Failed to load items' } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: {
      shop,
      items,
    },
    error: null,
  })
}
