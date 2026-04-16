import { checkAdminStatus } from '@/lib/admin/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConfigEditor } from '@/components/admin/config-editor'

export default async function ConfigPage() {
  const adminStatus = await checkAdminStatus()

  if (!adminStatus || (!adminStatus.role.includes('super_admin') && !adminStatus.role.includes('config_admin'))) {
    redirect('/unauthorized')
  }

  const supabase = await createClient()
  const { data: configs } = await supabase
    .from('app_config')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true })

  const groupedConfigs = (configs || []).reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = []
    }
    acc[config.category].push(config)
    return acc
  }, {} as Record<string, NonNullable<typeof configs>>)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuration Management</h1>
        <p className="text-gray-600 mt-2">
          Manage application settings and feature flags
        </p>
      </div>

      <ConfigEditor configs={groupedConfigs} />
    </div>
  )
}
