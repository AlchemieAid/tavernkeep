/**
 * Next.js Middleware for Authentication and Session Management
 * 
 * @fileoverview
 * Handles authentication, session refresh, and route protection for the entire app.
 * Runs on every request before reaching the page or API route, ensuring users are
 * authenticated and sessions are kept fresh.
 * 
 * @architecture
 * **Request Flow:**
 * ```
 * 1. Request arrives → Middleware intercepts
 * 2. Create Supabase client with cookie access
 * 3. Refresh session if expired
 * 4. Check route protection rules
 * 5. Allow/redirect/block based on auth state
 * 6. Pass request to destination
 * ```
 * 
 * **Protected Routes:**
 * - `/dm/*` - DM dashboard and management (redirects to /login)
 * - `/api/dm/*` - DM API endpoints (returns 401 JSON)
 * 
 * **Session Refresh:**
 * - Automatically refreshes expired sessions
 * - Updates cookies with new session tokens
 * - Prevents users from being logged out unexpectedly
 * 
 * **Cookie Management:**
 * - Reads cookies from incoming request
 * - Sets cookies in outgoing response
 * - Handles session token rotation
 * 
 * **Performance:**
 * - Runs on Edge Runtime (fast, globally distributed)
 * - Minimal overhead (~10-50ms per request)
 * - Only runs on matched routes (see config.matcher)
 * 
 * @example
 * ```typescript
 * // Middleware automatically protects these routes:
 * 
 * // ✅ Allowed: Authenticated user accessing DM dashboard
 * GET /dm/dashboard → 200 (page rendered)
 * 
 * // ❌ Blocked: Unauthenticated user accessing DM dashboard
 * GET /dm/dashboard → 302 (redirect to /login)
 * 
 * // ❌ Blocked: Unauthenticated API call
 * POST /api/dm/generate-town → 401 { error: 'Unauthorized' }
 * 
 * // ✅ Allowed: Public routes
 * GET /login → 200 (no auth required)
 * GET /shops/tavern-of-heroes → 200 (public shop page)
 * ```
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 * @see {@link https://supabase.com/docs/guides/auth/server-side/nextjs}
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware function that runs on every request
 * 
 * @param request - Incoming Next.js request
 * @returns Next.js response (allow, redirect, or block)
 * 
 * @description
 * **Responsibilities:**
 * 1. **Session Refresh:** Keeps user sessions alive
 * 2. **Route Protection:** Blocks unauthorized access
 * 3. **Cookie Management:** Updates session cookies
 * 
 * **Flow:**
 * ```
 * 1. Create Supabase client with request cookies
 * 2. Call getUser() to refresh session
 * 3. Check if route requires authentication
 * 4. Redirect/block if unauthorized
 * 5. Return response with updated cookies
 * ```
 * 
 * **Protected Routes:**
 * - DM pages: Redirect to /login
 * - DM APIs: Return 401 JSON
 * 
 * **Public Routes:**
 * - Landing page, login, public shops
 * - Static assets (images, CSS, JS)
 * 
 * @example
 * ```typescript
 * // This middleware automatically handles:
 * 
 * // Session refresh (transparent to user)
 * // Cookie updates (automatic)
 * // Auth checks (no code needed in pages)
 * ```
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect DM routes
  if (request.nextUrl.pathname.startsWith('/dm')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Protect DM API routes
  if (request.nextUrl.pathname.startsWith('/api/dm')) {
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dm/:path*',
    '/api/dm/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
