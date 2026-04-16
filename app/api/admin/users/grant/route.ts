import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/admin/auth'
import { grantAdminRole } from '@/lib/admin/auth'

export async function POST(request: NextRequest) {
  try {
    const isSuperAdminUser = await isSuperAdmin()

    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role, notes } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role' },
        { status: 400 }
      )
    }

    if (!['super_admin', 'config_admin', 'data_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be super_admin, config_admin, or data_admin' },
        { status: 400 }
      )
    }

    const result = await grantAdminRole(userId, role, notes)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Grant admin role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
