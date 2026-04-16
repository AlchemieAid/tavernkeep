/**
 * Shop CRUD API Route
 * 
 * @route GET /api/dm/shops/[shopId]
 * @route PATCH /api/dm/shops/[shopId]
 * @route DELETE /api/dm/shops/[shopId]
 * @auth Required - DM only
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const { data: shop, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .eq('dm_id', user.id)
    .single()

  if (error || !shop) {
    return NextResponse.json(
      { data: null, error: { message: 'Shop not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json({
    data: shop,
    error: null,
  })
}
