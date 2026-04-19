import { checkAdminStatus } from '@/lib/admin/auth'
import { getAuditStats } from '@/lib/admin/audit'
import { getCacheStats } from '@/lib/admin/config'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  Activity, 
  Database, 
  Settings, 
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  const adminStatus = await checkAdminStatus()
  const supabase = await createClient()

  const [auditStats, cacheStats, configCount, adminCount] = await Promise.all([
    getAuditStats(),
    getCacheStats(),
    supabase.from('app_config').select('*', { count: 'exact', head: true }),
    supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const stats = [
    {
      title: 'Total Admin Actions',
      value: auditStats.totalActions.toLocaleString(),
      description: 'All-time admin operations',
      icon: Activity,
      color: 'text-gold',
      bgColor: 'bg-gold/20',
    },
    {
      title: 'Configuration Items',
      value: configCount.count?.toLocaleString() || '0',
      description: 'Active config entries',
      icon: Settings,
      color: 'text-parchment',
      bgColor: 'bg-parchment/20',
    },
    {
      title: 'Active Admins',
      value: adminCount.count?.toLocaleString() || '0',
      description: 'Users with admin access',
      icon: Users,
      color: 'text-ember',
      bgColor: 'bg-ember/20',
    },
    {
      title: 'Cached Configs',
      value: cacheStats.size.toString(),
      description: `${cacheStats.entries.length} active cache entries`,
      icon: TrendingUp,
      color: 'text-gold-light',
      bgColor: 'bg-gold-light/20',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Admin Dashboard</h1>
        <p className="body-md text-on-surface-variant mt-2">
          Welcome back, <span className="font-semibold capitalize text-on-surface">{adminStatus?.role.replace('_', ' ')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-on-surface-variant">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-on-surface">{stat.value}</div>
                <p className="text-xs text-on-surface-variant mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-on-surface">
              <Activity className="h-5 w-5 text-gold" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-on-surface-variant">Admin actions in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(auditStats.actionsByType).slice(0, 5).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant capitalize">
                    {action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{count}</span>
                </div>
              ))}
              {Object.keys(auditStats.actionsByType).length === 0 && (
                <p className="text-sm text-on-surface-variant text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-on-surface">
              <Database className="h-5 w-5 text-ember" />
              System Health
            </CardTitle>
            <CardDescription className="text-on-surface-variant">Current system status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gold" />
                  <span className="text-sm text-on-surface-variant">Database</span>
                </div>
                <span className="text-sm font-semibold text-gold">Healthy</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gold" />
                  <span className="text-sm text-on-surface-variant">Config Cache</span>
                </div>
                <span className="text-sm font-semibold text-gold">Active</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {auditStats.recentFailures > 0 ? (
                    <AlertCircle className="h-4 w-4 text-error" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-gold" />
                  )}
                  <span className="text-sm text-on-surface-variant">Failed Actions (24h)</span>
                </div>
                <span className={`text-sm font-semibold ${
                  auditStats.recentFailures > 0 ? 'text-error' : 'text-gold'
                }`}>
                  {auditStats.recentFailures}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gold" />
                  <span className="text-sm text-on-surface-variant">RLS Policies</span>
                </div>
                <span className="text-sm font-semibold text-gold">Enforced</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-on-surface">Quick Actions</CardTitle>
          <CardDescription className="text-on-surface-variant">Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/config"
              className="flex items-center gap-3 p-4 border border-outline rounded-lg hover:border-gold hover:bg-surface-container transition-all duration-150"
            >
              <Settings className="h-5 w-5 text-gold" />
              <div>
                <div className="font-semibold text-on-surface">Manage Config</div>
                <div className="text-xs text-on-surface-variant">Update app settings</div>
              </div>
            </Link>

            <Link
              href="/admin/data"
              className="flex items-center gap-3 p-4 border border-outline rounded-lg hover:border-gold hover:bg-surface-container transition-all duration-150"
            >
              <Database className="h-5 w-5 text-parchment" />
              <div>
                <div className="font-semibold text-on-surface">Browse Data</div>
                <div className="text-xs text-on-surface-variant">View database records</div>
              </div>
            </Link>

            <Link
              href="/admin/audit"
              className="flex items-center gap-3 p-4 border border-outline rounded-lg hover:border-gold hover:bg-surface-container transition-all duration-150"
            >
              <Activity className="h-5 w-5 text-ember" />
              <div>
                <div className="font-semibold text-on-surface">View Audit Log</div>
                <div className="text-xs text-on-surface-variant">Track all changes</div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
