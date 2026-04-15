/**
 * Visibility Toggle Component
 * 
 * @fileoverview
 * Provides a UI control for DMs to toggle entity visibility between "revealed to players"
 * and "hidden from players". Implements optimistic UI updates with automatic rollback
 * on failure, ensuring a smooth user experience.
 * 
 * @component
 * **Use Cases:**
 * - Hide towns until players discover them
 * - Conceal shops until players explore the area
 * - Keep notable people secret until they're introduced
 * 
 * **Optimistic Updates:**
 * ```
 * 1. User clicks toggle
 * 2. UI updates immediately (optimistic)
 * 3. API call starts in background
 * 4. On success: UI stays updated
 * 5. On failure: UI reverts + shows error
 * ```
 * 
 * **Variants:**
 * - `button`: Full button with text label (default)
 * - `icon`: Compact icon-only button for tables/lists
 * 
 * @example
 * ```tsx
 * // Full button variant
 * <VisibilityToggle
 *   entityType="town"
 *   entityId={town.id}
 *   isRevealed={town.is_revealed}
 *   entityName={town.name}
 *   onToggle={handleToggleVisibility}
 * />
 * 
 * // Icon variant for compact spaces
 * <VisibilityToggle
 *   entityType="shop"
 *   entityId={shop.id}
 *   isRevealed={shop.is_revealed}
 *   entityName={shop.name}
 *   onToggle={handleToggleVisibility}
 *   variant="icon"
 * />
 * ```
 */

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Props for the VisibilityToggle component
 */
interface VisibilityToggleProps {
  /** Type of entity being toggled (determines API endpoint) */
  entityType: 'town' | 'shop' | 'notable_person'
  /** Unique identifier for the entity */
  entityId: string
  /** Current visibility state (true = revealed to players) */
  isRevealed: boolean
  /** Display name of the entity (used in error messages) */
  entityName: string
  /** Callback function to handle the toggle action */
  onToggle: (entityId: string, newState: boolean) => Promise<void>
  /** Visual variant of the toggle button */
  variant?: 'button' | 'icon'
}

/**
 * Visibility toggle button for DM-controlled entity revelation
 * 
 * @description
 * Renders a toggle button that allows DMs to control whether an entity
 * (town, shop, or notable person) is visible to players. Uses React's
 * useTransition for non-blocking updates and implements optimistic UI
 * with automatic rollback on errors.
 * 
 * **State Management:**
 * - Local state tracks current visibility (for optimistic updates)
 * - useTransition prevents UI blocking during API calls
 * - Automatic revert on failure maintains data consistency
 * 
 * **Accessibility:**
 * - Icon variant includes title attribute for tooltips
 * - Disabled state during pending operations
 * - Visual feedback via color (green = revealed, muted = hidden)
 * 
 * **Error Handling:**
 * - Catches toggle failures
 * - Reverts optimistic update
 * - Shows user-friendly alert with entity name
 */
export function VisibilityToggle({ 
  entityType, 
  entityId, 
  isRevealed, 
  entityName, 
  onToggle,
  variant = 'button'
}: VisibilityToggleProps) {
  const [isPending, startTransition] = useTransition()
  const [revealed, setRevealed] = useState(isRevealed)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const newState = !revealed
    setRevealed(newState)
    
    startTransition(async () => {
      try {
        await onToggle(entityId, newState)
      } catch (error: any) {
        console.error('Failed to toggle visibility:', error)
        setRevealed(!newState) // Revert on error
        alert(`Failed to ${revealed ? 'hide' : 'reveal'} ${entityName}`)
      }
    })
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={isPending}
        className="h-8 w-8"
        title={revealed ? 'Revealed to players' : 'Hidden from players'}
      >
        {revealed ? (
          <Eye className="w-4 h-4 text-green-600" />
        ) : (
          <EyeOff className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={revealed ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className="gap-2"
    >
      {revealed ? (
        <>
          <Eye className="w-4 h-4" />
          Revealed to Players
        </>
      ) : (
        <>
          <EyeOff className="w-4 h-4" />
          Hidden from Players
        </>
      )}
    </Button>
  )
}
