import { NextRequest, NextResponse } from 'next/server'
import { checkAdminStatus } from '@/lib/admin/auth'
import { updateConfig } from '@/lib/admin/config'
import { logAdminAction } from '@/lib/admin/audit'

export async function PATCH(request: NextRequest) {
  try {
    const adminStatus = await checkAdminStatus()

    if (!adminStatus || (!adminStatus.role.includes('super_admin') && !adminStatus.role.includes('config_admin'))) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: key, value' },
        { status: 400 }
      )
    }

    const result = await updateConfig(key, value)

    if (!result.success) {
      await logAdminAction(
        'config_update',
        'app_config',
        key,
        undefined,
        value,
        false,
        result.error
      )

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Config update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
