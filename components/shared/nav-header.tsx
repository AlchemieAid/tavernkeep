import { createClient } from '@/lib/supabase/server'
import { ProfileMenu } from './profile-menu'
import { VersionBadge } from './version-badge'
import { NavigationDropdowns } from './navigation-dropdowns'
import { MobileNavigation } from './mobile-navigation'
import Link from 'next/link'

export async function NavHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return (
    <header className="sticky top-0 z-50 bg-surface-container border-b border-outline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Mobile hamburger menu */}
            <MobileNavigation />
            
            <Link href="/dm/dashboard" className="flex items-center gap-2">
              <h1 className="headline-sm text-gold">TavernKeep</h1>
            </Link>
            
            {/* Desktop navigation dropdowns - hidden on mobile */}
            <div className="hidden lg:block">
              <NavigationDropdowns />
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <VersionBadge />
            <ProfileMenu 
              userEmail={user.email || null}
              displayName={(profile as { display_name: string | null } | null)?.display_name || null}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
