/**
 * Admin Data Browser Page
 *
 * Lists every table in the public schema using the curated registry,
 * augmented with auto-discovered tables for forward-compatibility.
 * Counts are obtained via the service-role client so admins see the
 * real row count (not their own RLS-filtered slice).
 */
import { requireAdmin } from '@/lib/admin/auth'
import {
  createAdminClient,
  isAdminClientConfigured,
} from '@/lib/admin/supabase-admin'
import { discoverTables } from '@/lib/admin/schema-registry'
import { DataBrowser } from '@/components/admin/data-browser'

export default async function DataBrowserPage() {
  await requireAdmin()

  if (!isAdminClientConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="headline-lg text-gold">Data Browser</h1>
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-on-surface">
          <p className="font-semibold text-rose-300">Configuration required</p>
          <p className="text-sm text-on-surface-variant mt-1">
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> is not set.
            The data browser relies on a service-role client to read across
            all users (bypassing RLS). Add the key to your environment and
            redeploy. See <code className="font-mono">.env.example</code>.
          </p>
        </div>
      </div>
    )
  }

  const tables = await discoverTables()
  const admin = createAdminClient()

  const tableCounts = await Promise.all(
    tables.map(async (table) => {
      // Dynamic table access — registry guarantees the name is valid.
      const { count, error } = await (admin as any)
        .from(table.name)
        .select('*', { count: 'exact', head: true })
      return {
        ...table,
        count: count ?? 0,
        error: error?.message ?? null,
      }
    })
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Data Browser</h1>
        <p className="body-md text-on-surface-variant mt-2">
          View and explore database records ({tableCounts.length} tables)
        </p>
      </div>

      <DataBrowser tables={tableCounts} />
    </div>
  )
}
