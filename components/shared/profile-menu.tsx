/**
 * Profile Menu
 * 
 * @fileoverview
 * User profile dropdown with email display and logout functionality.
 * 
 * @features
 * - User email display
 * - Admin panel access (if admin)
 * - Logout action
 * - Dropdown menu
 */

'use client'

import { useState } from 'react'
import { User, LogOut, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ProfileMenuProps {
  userEmail: string | null
  displayName?: string | null
  isAdmin?: boolean
}

export function ProfileMenu({ userEmail, displayName, isAdmin }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    const response = await fetch('/auth/signout', { method: 'POST' })
    if (response.redirected) {
      window.location.href = response.url
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-container transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
          <User className="w-5 h-5 text-on-gold" />
        </div>
        <div className="text-left hidden md:block">
          <div className="text-sm font-medium text-on-surface">
            {displayName || 'DM'}
          </div>
          <div className="text-xs text-on-surface-variant">
            {userEmail}
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-surface-container rounded-md shadow-lg z-20 border border-outline">
            <div className="p-4 border-b border-outline">
              <div className="text-sm font-medium text-on-surface">
                {displayName || 'Dungeon Master'}
              </div>
              <div className="text-xs text-on-surface-variant mt-1">
                {userEmail}
              </div>
            </div>
            <div className="p-2">
              {isAdmin && (
                <Link href="/admin" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start text-left"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
