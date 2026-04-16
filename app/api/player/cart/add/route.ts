/**
 * Player Cart Add API Route
 * 
 * @route POST /api/player/cart/add
 * @auth Required - Player
 * @description Add item to player's cart for a specific shop
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AddToCartSchema } from '@/lib/validators/cart'

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
    const validation = AddToCartSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { message: validation.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { characterId, itemId, shopId, quantity } = validation.data

    // Verify character belongs to this player
    const { data: character } = await supabase
      .from('characters')
      .select('id, player_id')
      .eq('id', characterId)
      .single()

    if (!character) {
      return NextResponse.json(
        { data: null, error: { message: 'Character not found' } },
        { status: 404 }
      )
    }

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!player || character.player_id !== player.id) {
      return NextResponse.json(
        { data: null, error: { message: 'Not your character' } },
        { status: 403 }
      )
    }

    // Check if item is already locked by another character
    const { data: existingLock } = await supabase
      .from('cart_items')
      .select('character_id')
      .eq('item_id', itemId)
      .neq('character_id', characterId)
      .single()

    if (existingLock) {
      return NextResponse.json(
        { data: null, error: { message: 'This item is already in another player\'s cart' } },
        { status: 409 }
      )
    }

    // Check if item exists and has sufficient stock
    const { data: item } = await supabase
      .from('items')
      .select('id, name, stock_quantity')
      .eq('id', itemId)
      .single()

    if (!item) {
      return NextResponse.json(
        { data: null, error: { message: 'Item not found' } },
        { status: 404 }
      )
    }

    if (item.stock_quantity !== null && item.stock_quantity < quantity) {
      return NextResponse.json(
        { data: null, error: { message: `Only ${item.stock_quantity} available` } },
        { status: 400 }
      )
    }

    // Add to cart (or update quantity if already in cart)
    const { data: cartItem, error: cartError } = await supabase
      .from('cart_items')
      .upsert({
        character_id: characterId,
        item_id: itemId,
        shop_id: shopId,
        quantity: quantity,
      } as any, {
        onConflict: 'character_id,item_id'
      })
      .select()
      .single()

    if (cartError) {
      console.error('Error adding to cart:', cartError)
      return NextResponse.json(
        { data: null, error: { message: 'Failed to add item to cart' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: cartItem, error: null })
  } catch (error) {
    console.error('Add to cart failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
