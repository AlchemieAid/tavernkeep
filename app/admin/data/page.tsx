import { checkAdminStatus } from '@/lib/admin/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DataBrowser } from '@/components/admin/data-browser'

export default async function DataBrowserPage() {
  const adminStatus = await checkAdminStatus()

  if (!adminStatus) {
    redirect('/unauthorized')
  }

  const supabase = await createClient()

  const tables = [
    { name: 'campaigns', label: 'Campaigns', icon: '🎲' },
    { name: 'towns', label: 'Towns', icon: '🏘️' },
    { name: 'shops', label: 'Shops', icon: '🏪' },
    { name: 'items', label: 'Shop Items', icon: '⚔️' },
    { name: 'item_library', label: 'Item Library', icon: '📚' },
    { name: 'notable_people', label: 'Notable People', icon: '👤' },
    { name: 'characters', label: 'Characters', icon: '🧙' },
    { name: 'players', label: 'Players', icon: '🎮' },
    { name: 'profiles', label: 'Profiles', icon: '👥' },
    { name: 'campaign_members', label: 'Campaign Members', icon: '🤝' },
    { name: 'cart_items', label: 'Cart Items', icon: '🛒' },
    { name: 'party_access', label: 'Party Access', icon: '🔑' },
    { name: 'ai_usage', label: 'AI Usage', icon: '🤖' },
    { name: 'usage_logs', label: 'Usage Logs', icon: '📊' },
    { name: 'app_config', label: 'App Config', icon: '⚙️' },
    { name: 'admin_users', label: 'Admin Users', icon: '👑' },
    { name: 'admin_audit_log', label: 'Audit Log', icon: '📝' },
  ]

  const tableCounts = await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase
        .from(table.name as any)
        .select('*', { count: 'exact', head: true })
      return { ...table, count: count || 0 }
    })
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Data Browser</h1>
        <p className="body-md text-on-surface-variant mt-2">
          View and explore database records
        </p>
      </div>

      <DataBrowser tables={tableCounts} />
    </div>
  )
}
