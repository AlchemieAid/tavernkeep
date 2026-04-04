import { createClient } from '@/lib/supabase/server'
import { ProfileMenu } from './profile-menu'
import { VersionBadge } from './version-badge'
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
    <header className="bg-surface-container border-b border-outline">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dm/dashboard" className="flex items-center gap-2">
            <h1 className="headline-sm text-gold">TavernKeep</h1>
          </Link>
          
          <div className="flex items-center gap-4">
            <VersionBadge />
            <ProfileMenu 
              userEmail={user.email || null}
              displayName={profile?.display_name || null}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
