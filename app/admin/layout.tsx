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
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <aside className="w-64 bg-gray-900 text-white flex flex-col">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <p className="text-xs text-gray-400 capitalize">{adminStatus.role}</p>
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <Link
              href="/dm"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Exit Admin</span>
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
