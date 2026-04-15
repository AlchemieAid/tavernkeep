/**
 * Shopping Cart (Shopping Bag)
 * 
 * @fileoverview
 * Player's shopping cart modal showing pending purchases for a specific shop.
 * Uses real-time subscriptions to sync cart state across sessions.
 * 
 * @features
 * - Real-time cart updates via Supabase Realtime
 * - Remove items from cart
 * - Total price calculation
 * - Modal dialog interface
 * - Automatic cleanup on unmount
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Backpack, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CartItem {
  id: string
  item_id: string
  quantity: number
  items: {
    name: string
    base_price_gp: number
    rarity: string
  }
}

interface ShoppingCartProps {
  characterId: string
  shopId: string
}

export function ShoppingBag({ characterId, shopId }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadCart()
    
    // Subscribe to cart changes
    const channel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `character_id=eq.${characterId}`
        },
        () => {
          loadCart()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId])

  async function loadCart() {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        item_id,
        quantity,
        items (
          name,
          base_price_gp,
          rarity
        )
      `)
      .eq('character_id', characterId)
      .eq('shop_id', shopId)

    if (!error && data) {
      setCartItems(data as any)
    }
  }

  async function removeItem(cartItemId: string) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/player/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        alert(error?.message || 'Failed to remove item')
      } else {
        await loadCart()
      }
    } catch (error) {
      console.error('Remove item error:', error)
      alert('Failed to remove item from cart')
    } finally {
      setIsLoading(false)
    }
  }

  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + (item.items.base_price_gp * item.quantity)
  }, 0)

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Backpack className="w-4 h-4 mr-2" />
          Bag
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-gold text-surface text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shopping Bag</DialogTitle>
        </DialogHeader>
        
        {cartItems.length === 0 ? (
          <div className="py-12 text-center">
            <Backpack className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Your bag is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((cartItem) => (
              <Card key={cartItem.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{cartItem.items.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {cartItem.items.rarity}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(cartItem.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Quantity: {cartItem.quantity}
                    </div>
                    <div className="font-semibold">
                      {cartItem.items.base_price_gp * cartItem.quantity} gp
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{totalPrice} gp</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Waiting for DM approval to finalize purchase
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
