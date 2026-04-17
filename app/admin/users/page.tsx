import { checkAdminStatus, getAllAdminUsers, isSuperAdmin } from '@/lib/admin/auth'
import { redirect } from 'next/navigation'
import { AdminUserManager } from '@/components/admin/admin-user-manager'

export default async function AdminUsersPage() {
  const adminStatus = await checkAdminStatus()

  if (!adminStatus) {
    redirect('/unauthorized')
  }

  const isSuperAdminUser = await isSuperAdmin()
  
  if (!isSuperAdminUser) {
    redirect('/unauthorized')
  }

  const adminUsers = await getAllAdminUsers()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin User Management</h1>
        <p className="text-slate-600 mt-2">
          Grant and revoke administrative privileges
        </p>
      </div>

      <AdminUserManager initialUsers={adminUsers} currentUserId={adminStatus.userId} />
    </div>
  )
}
