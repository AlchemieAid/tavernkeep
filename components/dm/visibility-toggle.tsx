'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface VisibilityToggleProps {
  entityType: 'town' | 'shop' | 'notable_person'
  entityId: string
  isRevealed: boolean
  entityName: string
}

export function VisibilityToggle({ entityType, entityId, isRevealed, entityName }: VisibilityToggleProps) {
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(isRevealed)
  const router = useRouter()
  const supabase = createClient()

  const getTableName = () => {
    switch (entityType) {
      case 'town':
        return 'towns'
      case 'shop':
        return 'shops'
      case 'notable_person':
        return 'notable_people'
    }
  }

  const handleToggle = async () => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from(getTableName())
        .update({ is_revealed: !revealed })
        .eq('id', entityId)

      if (error) throw error

      setRevealed(!revealed)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to toggle visibility:', error)
      alert(`Failed to ${revealed ? 'hide' : 'reveal'} ${entityName}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={revealed ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
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
