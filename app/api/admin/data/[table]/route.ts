import { NextRequest, NextResponse } from 'next/server'
import { checkAdminStatus } from '@/lib/admin/auth'
import { createClient } from '@/lib/supabase/server'

// Map of table names to their timestamp column for ordering
const TABLE_TIMESTAMP_COLUMNS: Record<string, string> = {
  campaigns: 'created_at',
  towns: 'created_at',
  shops: 'created_at',
  items: 'added_at', // items uses added_at, not created_at
  item_library: 'created_at',
  notable_people: 'created_at',
  characters: 'created_at',
  players: 'created_at',
  profiles: 'created_at',
  campaign_members: 'joined_at',
  cart_items: 'added_at',
  party_access: 'last_seen_at',
  ai_usage: 'created_at',
  usage_logs: 'created_at',
  app_config: 'created_at',
  admin_users: 'granted_at',
  admin_audit_log: 'created_at',
  app_config_history: 'created_at',
  ai_cache: 'created_at',
  catalog_items: 'created_at',
}

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

    const timestampColumn = TABLE_TIMESTAMP_COLUMNS[tableName]

    if (!timestampColumn) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Build query dynamically based on timestamp column
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(100)
      .order(timestampColumn, { ascending: false })

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
