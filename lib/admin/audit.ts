/**
 * Admin Audit Logging
 * 
 * @fileoverview
 * Comprehensive audit trail for all admin actions.
 * Automatically logs changes with before/after values.
 * 
 * @features
 * - Automatic change tracking
 * - Before/after value capture
 * - IP and user agent logging
 * - Success/failure tracking
 * - Rollback support
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminClientConfigured } from './supabase-admin'
import { headers } from 'next/headers'

/**
 * Admin action types
 */
export type AdminAction =
  | 'config_update'
  | 'config_create'
  | 'config_delete'
  | 'config_rollback'
  | 'data_create'
  | 'data_update'
  | 'data_delete'
  | 'admin_grant'
  | 'admin_revoke'
  | 'cache_clear'

/**
 * Log an admin action
 * 
 * @param action - Type of action performed
 * @param entityType - Type of entity affected
 * @param entityId - ID of entity affected
 * @param oldValue - Value before change (optional)
 * @param newValue - Value after change (optional)
 * @param success - Whether action succeeded
 * @param errorMessage - Error message if failed
 * 
 * @description
 * Records all admin actions to audit log for compliance and debugging.
 * Captures IP address and user agent automatically.
 * 
 * @example
 * ```typescript
 * await logAdminAction(
 *   'config_update',
 *   'app_config',
 *   'rate_limit_campaign',
 *   { maxRequests: 10 },
 *   { maxRequests: 20 }
 * )
 * ```
 */
export async function logAdminAction(
  action: AdminAction,
  entityType: string,
  entityId: string,
  oldValue?: any,
  newValue?: any,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[AUDIT] No user found for audit log')
      return
    }

    // Get IP and user agent from headers
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                      headersList.get('x-real-ip') || 
                      null
    const userAgent = headersList.get('user-agent') || null

    // Insert audit log entry
    const { error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        error_message: errorMessage,
      })

    if (error) {
      console.error('[AUDIT] Failed to log action:', error)
    }
  } catch (err) {
    console.error('[AUDIT] Error logging action:', err)
  }
}

/**
 * Get audit log entries
 * 
 * @param filters - Optional filters
 * @param limit - Max entries to return
 * @returns Array of audit log entries
 * 
 * @description
 * Fetches audit log with optional filtering.
 * Used by admin UI to display change history.
 */
export async function getAuditLog(
  filters?: {
    adminUserId?: string
    action?: AdminAction
    entityType?: string
    entityId?: string
    startDate?: Date
    endDate?: Date
  },
  limit: number = 100
): Promise<Array<{
  id: string
  adminUserId: string
  action: string
  entityType: string
  entityId: string | null
  oldValue: any
  newValue: any
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  errorMessage: string | null
  createdAt: string
}>> {
  const supabase = await createClient()
  
  let query = supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  // Apply filters
  if (filters?.adminUserId) {
    query = query.eq('admin_user_id', filters.adminUserId)
  }
  if (filters?.action) {
    query = query.eq('action', filters.action)
  }
  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }
  if (filters?.entityId) {
    query = query.eq('entity_id', filters.entityId)
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString())
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('[AUDIT] Error fetching audit log:', error)
    return []
  }

  return (data || []).map(entry => ({
    id: entry.id,
    adminUserId: entry.admin_user_id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    oldValue: entry.old_value,
    newValue: entry.new_value,
    ipAddress: entry.ip_address as string | null,
    userAgent: entry.user_agent,
    success: entry.success,
    errorMessage: entry.error_message,
    createdAt: entry.created_at,
  }))
}

/**
 * Get audit stats
 * 
 * @returns Audit statistics
 * 
 * @description
 * Returns summary statistics for the audit log.
 * Used by admin dashboard.
 */
export async function getAuditStats(): Promise<{
  totalActions: number
  actionsByType: Record<string, number>
  recentFailures: number
}> {
  const supabase = await createClient()

  // Get total count
  const { count: totalActions } = await supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })

  // Get actions by type
  const { data: actions } = await supabase
    .from('admin_audit_log')
    .select('action')

  const actionsByType: Record<string, number> = {}
  actions?.forEach(entry => {
    actionsByType[entry.action] = (actionsByType[entry.action] || 0) + 1
  })

  // Get recent failures (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const { count: recentFailures } = await supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('success', false)
    .gte('created_at', yesterday.toISOString())

  return {
    totalActions: totalActions || 0,
    actionsByType,
    recentFailures: recentFailures || 0,
  }
}
