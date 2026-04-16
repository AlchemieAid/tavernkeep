/**
 * Player Cart Remove API Route
 * 
 * @route POST /api/player/cart/remove
 * @auth Required - Player
 * @description Remove item from player's cart
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RemoveFromCartSchema } from '@/lib/validators/cart'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = RemoveFromCartSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { message: validation.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { cartItemId } = validation.data

    // Delete the cart item (RLS will ensure it belongs to this player's character)
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)

    if (deleteError) {
      console.error('Error removing from cart:', deleteError)
      return NextResponse.json(
        { data: null, error: { message: 'Failed to remove item from cart' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (error) {
    console.error('Remove from cart failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
