/**
 * Delete Menu (Actions Menu)
 * 
 * @fileoverview
 * Dropdown menu with edit/delete actions for entities.
 * Provides confirmation dialog for destructive actions.
 * 
 * @features
 * - Edit and delete options
 * - Confirmation dialog
 * - Optimistic UI updates
 */

'use client'

import { MoreVertical, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ActionMenuProps {
  itemType: 'campaign' | 'town' | 'shop' | 'item' | 'notable-person'
  itemId: string
  onDelete: (id: string) => Promise<void>
  editPath?: string
}

export function ActionMenu({ itemType, itemId, onDelete, editPath }: ActionMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this ${itemType}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(itemId)
    } catch (error) {
      console.error(`Failed to delete ${itemType}:`, error)
      alert(`Failed to delete ${itemType}. Please try again.`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    if (editPath) {
      router.push(editPath)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {editPath && (
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Backward compatibility export
export const DeleteMenu = ActionMenu
