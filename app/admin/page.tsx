import { checkAdminStatus } from '@/lib/admin/auth'
import { getAuditStats } from '@/lib/admin/audit'
import { getCacheStats } from '@/lib/admin/config'
import { createClient } from '@/lib/supabase/server'
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Configuration Items',
      value: configCount.count?.toLocaleString() || '0',
      description: 'Active config entries',
      icon: Settings,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Admins',
      value: adminCount.count?.toLocaleString() || '0',
      description: 'Users with admin access',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Cached Configs',
      value: cacheStats.size.toString(),
      description: `${cacheStats.entries.length} active cache entries`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, <span className="font-semibold capitalize">{adminStatus?.role.replace('_', ' ')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Admin actions in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(auditStats.actionsByType).slice(0, 5).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
              {Object.keys(auditStats.actionsByType).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Current system status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Database</span>
                </div>
                <span className="text-sm font-semibold text-green-600">Healthy</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Config Cache</span>
                </div>
                <span className="text-sm font-semibold text-green-600">Active</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {auditStats.recentFailures > 0 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm text-gray-600">Failed Actions (24h)</span>
                </div>
                <span className={`text-sm font-semibold ${
                  auditStats.recentFailures > 0 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {auditStats.recentFailures}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">RLS Policies</span>
                </div>
                <span className="text-sm font-semibold text-green-600">Enforced</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/config"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Settings className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold text-gray-900">Manage Config</div>
                <div className="text-xs text-gray-500">Update app settings</div>
              </div>
            </a>

            <a
              href="/admin/data"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <Database className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-gray-900">Browse Data</div>
                <div className="text-xs text-gray-500">View database records</div>
              </div>
            </a>

            <a
              href="/admin/audit"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-semibold text-gray-900">View Audit Log</div>
                <div className="text-xs text-gray-500">Track all changes</div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
