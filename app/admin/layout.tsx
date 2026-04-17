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
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-screen">
        {/* Dark sidebar with better contrast */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin Panel</h1>
                <p className="text-xs text-slate-400 capitalize">{adminStatus.role}</p>
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
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-150"
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-slate-700">
            <Link
              href="/dm/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-150"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Exit Admin</span>
            </Link>
          </div>
        </aside>

        {/* Light content area with better readability */}
        <main className="flex-1 overflow-auto bg-slate-50">
          <div className="p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
