/**
 * Sign Out Route
 * @route POST /auth/signout
 * @description Signs out user and redirects to /login
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const origin = new URL(request.url).origin

  await supabase.auth.signOut()

  return NextResponse.redirect(`${origin}/login`)
}
