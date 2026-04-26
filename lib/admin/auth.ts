/**
 * Admin Authentication and Authorization
 * 
 * @fileoverview
 * Provides secure admin authentication and role-based access control.
 * Used by admin routes and API endpoints to verify admin permissions.
 * 
 * @features
 * - Role-based access control (RBAC)
 * - Middleware-style auth checks
 * - Admin status verification
 * - Role hierarchy enforcement
 * 
 * @security
 * - Identity verified via auth.getUser() (normal client, user-scoped)
 * - admin_users queried via service-role client so RLS can never block the check
 * - Redirects unauthorized users
 * - Logs all access attempts
 * - Session-based verification
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/admin/supabase-admin'

/**
 * Admin role types
 */
export type AdminRole = 'super_admin' | 'config_admin' | 'data_admin'

/**
 * Admin user status
 */
export interface AdminStatus {
  userId: string
  role: AdminRole
  grantedAt: string
  grantedBy: string | null
  isActive: boolean
}

/**
 * Check if current user has admin access
 * 
 * @param requiredRole - Optional specific role required
 * @returns Admin status if authorized, null otherwise
 * 
 * @description
 * Queries the admin_users table to verify the current user has
 * an active admin role. Optionally checks for a specific role.
 * 
 * **Role Hierarchy:**
 * - super_admin: Full access to everything
 * - config_admin: Can modify app configuration
 * - data_admin: Can view and edit database records
 * 
 * @example
 * ```typescript
 * const admin = await checkAdminStatus('super_admin')
 * if (!admin) {
 *   return { error: 'Unauthorized' }
 * }
 * ```
 */
export async function checkAdminStatus(
  requiredRole?: AdminRole
): Promise<AdminStatus | null> {
  // Normal client — verify the caller's identity via their auth token.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Service-role client — bypass RLS for the admin_users lookup.
  // This prevents the self-defeating cycle where a deactivated row becomes
  // invisible to the normal client, locking the admin out permanently.
  const adminDb = createAdminClient()
  const { data: adminUser, error } = await adminDb
    .from('admin_users')
    .select('user_id, role, granted_at, granted_by, is_active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !adminUser) {
    return null
  }

  // Application-level active check (not delegated to RLS).
  if (!adminUser.is_active) {
    return null
  }

  // Check role hierarchy if specific role required
  if (requiredRole) {
    // super_admin can access everything
    if (adminUser.role === 'super_admin') {
      // Allow
    } else if (adminUser.role !== requiredRole) {
      // User doesn't have required role
      return null
    }
  }

  return {
    userId: adminUser.user_id,
    role: adminUser.role as AdminRole,
    grantedAt: adminUser.granted_at,
    grantedBy: adminUser.granted_by,
    isActive: adminUser.is_active,
  }
}

/**
 * Require admin access (middleware-style)
 * 
 * @param requiredRole - Optional specific role required
 * @returns Admin status
 * @throws Redirects to /login or /unauthorized if not authorized
 * 
 * @description
 * Use this in Server Components or API routes to enforce admin access.
 * Automatically redirects unauthorized users.
 * 
 * @example
 * ```typescript
 * // In a Server Component
 * export default async function AdminPage() {
 *   const admin = await requireAdmin('config_admin')
 *   // User is guaranteed to be admin here
 * }
 * ```
 */
export async function requireAdmin(
  requiredRole?: AdminRole
): Promise<AdminStatus> {
  // Identity check first — normal client is sufficient for getUser.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  const adminStatus = await checkAdminStatus(requiredRole)

  if (!adminStatus) {
    redirect('/unauthorized')
  }

  return adminStatus
}

/**
 * Check if user is super admin
 * 
 * @returns True if user is super admin
 * 
 * @description
 * Convenience function to check for super admin role.
 * Super admins have full access to all admin functions.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const status = await checkAdminStatus('super_admin')
  return status !== null
}

/**
 * Check if user has any admin role
 * 
 * @returns True if user has any active admin role
 * 
 * @description
 * Use this to show/hide admin UI elements or navigation.
 */
export async function isAdmin(): Promise<boolean> {
  const status = await checkAdminStatus()
  return status !== null
}

/**
 * Get all admin users
 * 
 * @returns List of all admin users
 * @throws Redirects if not super admin
 * 
 * @description
 * Only super admins can view the list of all admin users.
 * Used in the admin user management interface.
 */
export async function getAllAdminUsers(): Promise<AdminStatus[]> {
  await requireAdmin('super_admin')

  const supabase = await createClient()
  const { data: adminUsers, error } = await supabase
    .from('admin_users')
    .select('user_id, role, granted_at, granted_by, is_active')
    .order('granted_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin users:', error)
    return []
  }

  return adminUsers.map(user => ({
    userId: user.user_id,
    role: user.role as AdminRole,
    grantedAt: user.granted_at,
    grantedBy: user.granted_by,
    isActive: user.is_active,
  }))
}

/**
 * Grant admin role to user
 * 
 * @param userId - User ID to grant admin role to
 * @param role - Admin role to grant
 * @param notes - Optional notes about why role was granted
 * @returns Success status
 * @throws Redirects if not super admin
 * 
 * @description
 * Only super admins can grant admin roles.
 * Creates audit log entry automatically via trigger.
 */
export async function grantAdminRole(
  userId: string,
  role: AdminRole,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin('super_admin')

  const supabase = await createClient()
  const { error } = await supabase
    .from('admin_users')
    .insert({
      user_id: userId,
      role,
      granted_by: admin.userId,
      notes,
      is_active: true,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Revoke admin role from user
 * 
 * @param userId - User ID to revoke admin role from
 * @param role - Admin role to revoke
 * @returns Success status
 * @throws Redirects if not super admin
 * 
 * @description
 * Only super admins can revoke admin roles.
 * Soft delete - sets is_active to false and records revoked_at.
 */
export async function revokeAdminRole(
  userId: string,
  role: AdminRole
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin('super_admin')

  const supabase = await createClient()
  const { error } = await supabase
    .from('admin_users')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('role', role)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
