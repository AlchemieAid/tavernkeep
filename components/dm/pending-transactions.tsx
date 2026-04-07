'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CartItemWithDetails {
  id: string
  quantity: number
  character_id: string
  item_id: string
  locked_at: string
  characters: {
    name: string
    player_id: string
    players: {
      display_name: string
    }
  }
  items: {
    name: string
    price: number
    rarity: string
    stock_quantity: number | null
  }
}

interface PendingTransactionsProps {
  shopId: string
}

export function PendingTransactions({ shopId }: PendingTransactionsProps) {
  const [cartItems, setCartItems] = useState<CartItemWithDetails[]>([])
  const [conflicts, setConflicts] = useState<Map<string, number>>(new Map())
  const supabase = createClient()

  useEffect(() => {
    loadPendingCarts()

    // Subscribe to cart changes for real-time updates
    const channel = supabase
      .channel('pending-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `shop_id=eq.${shopId}`
        },
        () => {
          loadPendingCarts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId])

  async function loadPendingCarts() {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        character_id,
        item_id,
        locked_at,
        characters (
          name,
          player_id,
          players (
            display_name
          )
        ),
        items (
          name,
          price,
          rarity,
          stock_quantity
        )
      `)
      .eq('shop_id', shopId)
      .order('locked_at', { ascending: true })

    if (!error && data) {
      setCartItems(data as any)
      
      // Detect conflicts (multiple characters wanting same item)
      const itemCounts = new Map<string, number>()
      data.forEach(item => {
        const count = itemCounts.get(item.item_id) || 0
        itemCounts.set(item.item_id, count + 1)
      })
      setConflicts(itemCounts)
    }
  }

  // Group by character
  const cartsByCharacter = cartItems.reduce((acc, item) => {
    const key = item.character_id
    if (!acc[key]) {
      acc[key] = {
        character: item.characters,
        items: []
      }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { character: any, items: CartItemWithDetails[] }>)

  if (Object.keys(cartsByCharacter).length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No pending transactions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(cartsByCharacter).map(([characterId, { character, items }]) => {
        const totalPrice = items.reduce((sum, item) => sum + (item.items.price * item.quantity), 0)
        const hasConflicts = items.some(item => (conflicts.get(item.item_id) || 0) > 1)

        return (
          <Card key={characterId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {character.name}
                    {hasConflicts && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Conflict
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Player: {character.players.display_name}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{totalPrice} gp</div>
                  <div className="text-sm text-muted-foreground">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item) => {
                  const isConflicted = (conflicts.get(item.item_id) || 0) > 1
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        isConflicted ? 'bg-red-50 border border-red-200' : 'bg-muted'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {item.items.name}
                          {isConflicted && (
                            <Badge variant="destructive" className="text-xs">
                              Multiple Players
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {item.items.rarity} · Qty: {item.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {item.items.price * item.quantity} gp
                        </div>
                        {item.items.stock_quantity !== null && (
                          <div className="text-xs text-muted-foreground">
                            Stock: {item.items.stock_quantity}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Transaction finalization coming in Phase 4
                </p>
                <Button disabled className="w-full">
                  Finalize Transaction (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
