import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/admin/auth'
import { revokeAdminRole } from '@/lib/admin/auth'

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
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role' },
        { status: 400 }
      )
    }

    const result = await revokeAdminRole(userId, role)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Revoke admin role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
