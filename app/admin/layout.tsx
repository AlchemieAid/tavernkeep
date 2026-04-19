import { redirect } from 'next/navigation'
import { checkAdminStatus } from '@/lib/admin/auth'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Settings, 
  Database, 
  FileText, 
  Users,
  LogOut,
  Shield
} from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminStatus = await checkAdminStatus()

  if (!adminStatus || !adminStatus.isActive) {
    redirect('/unauthorized')
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/config', icon: Settings, label: 'Configuration' },
    { href: '/admin/data', icon: Database, label: 'Data Browser' },
    { href: '/admin/audit', icon: FileText, label: 'Audit Log' },
    { href: '/admin/users', icon: Users, label: 'Admin Users' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex h-screen">
        {/* Sidebar using design system colors */}
        <aside className="w-64 bg-surface-container-low border-r border-outline flex flex-col">
          <div className="p-6 border-b border-outline">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/20 rounded-lg">
                <Shield className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-on-surface">Admin Panel</h1>
                <p className="text-xs text-on-surface-variant capitalize">{adminStatus.role}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all duration-150"
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-outline">
            <Link
              href="/dm/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all duration-150"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Exit Admin</span>
            </Link>
          </div>
        </aside>

        {/* Main content area using design system */}
        <main className="flex-1 overflow-auto bg-surface">
          <div className="p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
