/**
 * Admin Data Browser API
 *
 * Returns rows from any table whose metadata is resolvable via the
 * schema registry. Uses the service-role client to bypass RLS — admin
 * authentication is enforced first via `requireAdmin`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/admin/supabase-admin'
import {
  resolveTableMetadata,
  TABLE_REGISTRY,
} from '@/lib/admin/schema-registry'

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ table: string }> | { table: string } }
) {
  try {
    // Authorization: any admin role can read.
    await requireAdmin()

    // Next.js 15: params may be a Promise.
    const { table: tableName } = await Promise.resolve(context.params)

    const meta = resolveTableMetadata(tableName)
    if (!meta) {
      return NextResponse.json(
        { error: `Table "${tableName}" is not exposed to the admin browser.` },
        { status: 400 }
      )
    }

    // Lightweight defence-in-depth: only allow safe identifier characters.
    if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Invalid table identifier' },
        { status: 400 }
      )
    }

    const url = new URL(request.url)
    const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
      : DEFAULT_LIMIT

    const admin = createAdminClient()

    // Dynamic table access: cast the client to a permissive shape because
    // the generated Database types only allow literal table names.
    // Identifier safety is enforced above by the regex + registry lookup.
    let query: ReturnType<typeof admin.from> = admin
      .from(tableName as never)
      .select('*', { count: 'exact' })
      .limit(limit)

    if (meta.timestampColumn) {
      query = query.order(meta.timestampColumn, { ascending: false })
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[API] Data fetch error for', tableName, error)
      return NextResponse.json(
        { error: error.message ?? 'Failed to fetch data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      records: data ?? [],
      total: count ?? null,
      limit,
      curated: Boolean(TABLE_REGISTRY[tableName]),
      table: meta,
    })
  } catch (error) {
    console.error('[API] Data browser error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    // requireAdmin throws redirect() — let those propagate; otherwise 500.
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
