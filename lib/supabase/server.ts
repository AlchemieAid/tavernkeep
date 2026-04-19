/**
 * Supabase Server Client
 * 
 * @fileoverview
 * Creates a Supabase client for server-side operations in Next.js App Router.
 * Handles authentication via cookies and provides type-safe database access.
 * 
 * @architecture
 * **Server-Side Authentication Flow:**
 * ```
 * 1. Next.js Server Component/API Route calls createClient()
 * 2. Client reads auth cookies from request
 * 3. Supabase validates session from cookies
 * 4. Returns authenticated client with user context
 * ```
 * 
 * **Cookie Management:**
 * - Uses Next.js cookies() API for server-side cookie access
 * - Automatically reads all cookies for session validation
 * - Attempts to set cookies for session refresh
 * - Gracefully handles Server Component limitations
 * 
 * **Type Safety:**
 * - Uses generated Database types from Supabase CLI
 * - Provides full TypeScript autocomplete for tables/columns
 * - Validates queries at compile time
 * 
 * **Security:**
 * - Uses NEXT_PUBLIC_SUPABASE_ANON_KEY (RLS enforced)
 * - Never exposes service role key
 * - All queries subject to Row Level Security policies
 * - User context automatically applied to queries
 * 
 * @example
 * ```typescript
 * // In a Server Component
 * import { createClient } from '@/lib/supabase/server'
 * 
 * export default async function Page() {
 *   const supabase = await createClient()
 *   
 *   const { data: campaigns } = await supabase
 *     .from('campaigns')
 *     .select('*')
 *     .eq('dm_id', userId)
 *   
 *   return <div>{campaigns?.map(c => c.name)}</div>
 * }
 * 
 * // In an API Route
 * import { createClient } from '@/lib/supabase/server'
 * 
 * export async function GET() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('shops').select('*')
 *   return Response.json(data)
 * }
 * ```
 * 
 * @see {@link https://supabase.com/docs/guides/auth/server-side/nextjs}
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Create a Supabase client for server-side operations
 * 
 * @returns Promise resolving to authenticated Supabase client
 * 
 * @description
 * Creates a server-side Supabase client with cookie-based authentication.
 * This client is used in:
 * - Server Components (for data fetching)
 * - API Routes (for mutations)
 * - Server Actions (for form submissions)
 * 
 * **Cookie Handling:**
 * - `getAll()`: Reads all cookies from the request
 * - `setAll()`: Attempts to set cookies for session refresh
 * - Silently fails in Server Components (middleware handles refresh)
 * 
 * **Authentication:**
 * - Automatically validates session from cookies
 * - Returns user context if authenticated
 * - Returns anonymous client if not authenticated
 * 
 * **Important:** Always await this function before using the client.
 * 
 * @example
 * ```typescript
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          // Add connection pooling hint
          'x-connection-pooling': 'true',
        },
      },
    }
  )
}
