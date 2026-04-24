/**
 * Admin Supabase Client (Service Role)
 *
 * @fileoverview
 * Creates a service-role Supabase client that bypasses Row Level Security.
 * This is required for legitimate admin operations that need to read/write
 * data across all users (e.g. data browser, audit log inserts, cross-DM
 * configuration).
 *
 * @security
 * - Uses SUPABASE_SERVICE_ROLE_KEY (server-only, never sent to browser)
 * - Authorization is enforced at the application layer via `requireAdmin()`
 *   in @/lib/admin/auth before this client is ever instantiated.
 * - Never expose this client to a Client Component.
 * - Never use this client to act on behalf of a user without first
 *   verifying their admin status.
 *
 * @architecture
 * Pattern:
 *   1. API route / Server Action calls `requireAdmin(role)` first.
 *   2. Only after auth passes, call `createAdminClient()` for DB work.
 *   3. The service-role client bypasses RLS, allowing the admin to see
 *      and edit data owned by any user.
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Cached singleton service-role client.
 * Service-role clients have no per-request state, so a single instance is
 * safe to reuse across invocations on the same warm container.
 */
let cachedAdminClient: SupabaseClient<Database> | null = null

/**
 * Lazily initialise and return the admin Supabase client.
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not configured
 *
 * @returns A Supabase client that bypasses RLS
 *
 * @example
 * ```typescript
 * import { requireAdmin } from '@/lib/admin/auth'
 * import { createAdminClient } from '@/lib/admin/supabase-admin'
 *
 * export async function GET() {
 *   await requireAdmin('data_admin')
 *   const admin = createAdminClient()
 *   const { data } = await admin.from('campaigns').select('*')
 *   return Response.json({ records: data })
 * }
 * ```
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (cachedAdminClient) return cachedAdminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      '[ADMIN] NEXT_PUBLIC_SUPABASE_URL is not configured.'
    )
  }
  if (!serviceRoleKey) {
    throw new Error(
      '[ADMIN] SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'The admin data browser, audit log writes, and cross-user config edits ' +
      'require the service role key. Add it to your environment ' +
      '(see .env.example).'
    )
  }

  cachedAdminClient = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: { schema: 'public' },
    global: {
      headers: {
        'x-admin-client': 'true',
      },
    },
  })

  return cachedAdminClient
}

/**
 * Returns true when the service-role key is configured.
 * Used by health checks and graceful UI degradation.
 */
export function isAdminClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}
