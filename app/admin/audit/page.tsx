import { checkAdminStatus } from '@/lib/admin/auth'
import { getAuditLog } from '@/lib/admin/audit'
import { AuditLogViewer } from '@/components/admin/audit-log-viewer'

export default async function AuditLogPage() {
  const adminStatus = await checkAdminStatus()

  if (!adminStatus) {
    return null
  }

  const auditLogs = await getAuditLog({}, 100)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-600 mt-2">
          Complete history of all administrative actions
        </p>
      </div>

      <AuditLogViewer initialLogs={auditLogs} />
    </div>
  )
}
