import { NextRequest, NextResponse } from 'next/server'
import { checkAdminStatus } from '@/lib/admin/auth'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TABLES = [
  'campaigns',
  'towns',
  'shops',
  'items',
  'item_library',
  'notable_people',
  'characters',
  'players',
  'profiles',
  'campaign_members',
  'cart_items',
  'party_access',
  'ai_usage',
  'usage_logs',
  'app_config',
  'admin_users',
  'admin_audit_log',
  'app_config_history',
  'ai_cache',
]

export async function GET(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const adminStatus = await checkAdminStatus()

    if (!adminStatus) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const tableName = params.table

    if (!ALLOWED_TABLES.includes(tableName)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(100)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] Data fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ records: data || [] })
  } catch (error) {
    console.error('[API] Data browser error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
