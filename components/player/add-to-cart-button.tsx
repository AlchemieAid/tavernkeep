/**
 * Add to Cart Button
 * 
 * @fileoverview
 * Player-facing button for adding shop items to their character's cart.
 * Handles locked items and provides loading states.
 * 
 * @features
 * - Optimistic UI with loading state
 * - Locked item detection
 * - Success callback for UI updates
 * - Error handling with toast
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Backpack, Lock } from 'lucide-react'

interface AddToCartButtonProps {
  characterId: string
  itemId: string
  shopId: string
  itemName: string
  isLocked?: boolean
  onSuccess?: () => void
}

export function AddToCartButton({
  characterId,
  itemId,
  shopId,
  itemName,
  isLocked = false,
  onSuccess
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleAddToCart() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/player/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          itemId,
          shopId,
          quantity: 1,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error?.message || 'Failed to add to cart')
      } else {
        onSuccess?.()
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      alert('Failed to add item to cart')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLocked) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Lock className="w-4 h-4 mr-2" />
        In Another Bag
      </Button>
    )
  }

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isLoading}
      className="w-full"
    >
      <Backpack className="w-4 h-4 mr-2" />
      {isLoading ? 'Adding...' : 'Add to Bag'}
    </Button>
  )
}
