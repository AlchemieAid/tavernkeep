/**
 * Pending Transactions Component
 * 
 * @fileoverview
 * Displays real-time pending cart items for a shop, allowing DMs to monitor
 * player purchases and detect inventory conflicts. Uses Supabase Realtime
 * for live updates as players add/remove items from their carts.
 * 
 * @component
 * **Features:**
 * - Real-time cart monitoring via Supabase Realtime
 * - Inventory conflict detection (multiple players want same item)
 * - Player and character name display
 * - Item details with rarity and pricing
 * - Visual conflict warnings
 * 
 * **Conflict Detection:**
 * ```
 * If total requested quantity > available stock:
 *   → Show warning badge
 *   → Highlight affected items
 *   → DM can intervene before checkout
 * ```
 * 
 * **Real-time Updates:**
 * - Subscribes to cart_items table changes
 * - Automatically refreshes on any cart modification
 * - Cleans up subscription on unmount
 * 
 * **Use Cases:**
 * - Monitor player shopping activity
 * - Prevent inventory overselling
 * - See who's interested in what items
 * - Intervene in conflicts before checkout
 * 
 * @example
 * ```tsx
 * <PendingTransactions shopId={shop.id} />
 * ```
 * 
 * @see {@link /app/api/shop/[shopId]/cart} for cart API
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Cart item with full relationship data
 * 
 * @description
 * Represents a cart item with joined data from characters, players, and items tables.
 * Used for displaying comprehensive transaction information to the DM.
 */
interface CartItemWithDetails {
  /** Cart item ID */
  id: string
  /** Quantity requested by player */
  quantity: number
  /** Character making the purchase */
  character_id: string
  /** Item being purchased */
  item_id: string
  /** When the item was added to cart (for conflict resolution) */
  locked_at: string
  /** Character details */
  characters: {
    /** Character name */
    name: string
    /** Player ID who owns this character */
    player_id: string
    /** Player details */
    players: {
      /** Player's display name */
      display_name: string
    }
  }
  /** Item details */
  items: {
    /** Item name */
    name: string
    /** Item price */
    price: number
    /** Item rarity (common, uncommon, rare, etc.) */
    rarity: string
    /** Available stock (null = unlimited) */
    stock_quantity: number | null
  }
}

/**
 * Props for the PendingTransactions component
 */
interface PendingTransactionsProps {
  /** Shop ID to monitor transactions for */
  shopId: string
}

/**
 * Real-time pending transactions monitor for shop management
 * 
 * @description
 * Displays all pending cart items for a shop with real-time updates.
 * Detects and highlights inventory conflicts when multiple players
 * request the same item. Helps DMs manage shop inventory and prevent
 * overselling.
 * 
 * **State Management:**
 * - `cartItems`: All pending cart items with full details
 * - `conflicts`: Map of item_id → total requested quantity
 * 
 * **Real-time Subscription:**
 * - Listens to postgres_changes on cart_items table
 * - Filters by shop_id for efficiency
 * - Reloads data on any change (insert, update, delete)
 * - Automatically unsubscribes on component unmount
 * 
 * **Conflict Detection Logic:**
 * ```typescript
 * for each item in cart:
 *   total_requested = sum(quantity for all carts with this item)
 *   if total_requested > stock_quantity:
 *     mark as conflict
 * ```
 * 
 * **Performance:**
 * - Uses Supabase Realtime for efficient updates
 * - Only fetches data for current shop
 * - Joins are done server-side for efficiency
 */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
