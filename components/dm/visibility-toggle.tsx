'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

interface VisibilityToggleProps {
  entityType: 'town' | 'shop' | 'notable_person'
  entityId: string
  isRevealed: boolean
  entityName: string
  onToggle: (entityId: string, newState: boolean) => Promise<void>
  variant?: 'button' | 'icon'
}

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
