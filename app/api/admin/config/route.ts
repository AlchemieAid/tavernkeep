/**
 * Admin Config API
 *
 * - Validates incoming values against per-key Zod schemas before write.
 * - Captures the previous value for audit & history.
 * - Logs every attempt (success and failure) to the admin audit log.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkAdminStatus } from '@/lib/admin/auth'
import {
  getConfigRaw,
  updateConfig,
  invalidateAllConfigCache,
} from '@/lib/admin/config'
import { logAdminAction } from '@/lib/admin/audit'
import { validateConfigValue } from '@/lib/admin/config-schemas'

export async function PATCH(request: NextRequest) {
  let key: string | undefined
  let value: unknown
  try {
    const adminStatus = await checkAdminStatus()

    if (
      !adminStatus ||
      (!adminStatus.role.includes('super_admin') &&
        !adminStatus.role.includes('config_admin'))
    ) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    key = body?.key
    value = body?.value

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: key, value' },
        { status: 400 }
      )
    }

    // Validate against the per-key schema (or accept unknown keys as-is).
    const validation = validateConfigValue(key, value)
    if (!validation.success) {
      await logAdminAction(
        'config_update',
        'app_config',
        key,
        undefined,
        value,
        false,
        `Validation: ${validation.error}`
      )
      return NextResponse.json(
        { error: `Invalid value: ${validation.error}` },
        { status: 400 }
      )
    }

    // Capture previous value for audit / history.
    const oldValue = await getConfigRaw(key)

    const result = await updateConfig(key, validation.value)

    await logAdminAction(
      'config_update',
      'app_config',
      key,
      oldValue,
      validation.value,
      result.success,
      result.success ? undefined : result.error
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, value: validation.value })
  } catch (error) {
    console.error('[API] Config update error:', error)
    if (key) {
      await logAdminAction(
        'config_update',
        'app_config',
        key,
        undefined,
        value,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Force-clear the in-memory config cache on this serverless instance.
 * Useful after manual DB edits or to verify fresh reads. Cross-instance
 * propagation still relies on the per-key TTL.
 */
export async function DELETE() {
  const adminStatus = await checkAdminStatus()
  if (
    !adminStatus ||
    (!adminStatus.role.includes('super_admin') &&
      !adminStatus.role.includes('config_admin'))
  ) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 403 }
    )
  }
  invalidateAllConfigCache()
  await logAdminAction('cache_clear', 'app_config', 'all', undefined, undefined, true)
  return NextResponse.json({ success: true, cleared: true })
}
