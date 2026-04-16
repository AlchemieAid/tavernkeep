/**
 * Google OAuth Route
 * @route GET/POST /auth/google
 * @description Initiates Google OAuth flow, redirects to /callback on success
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function handleGoogleAuth(request: Request) {
  const supabase = await createClient()
  const origin = new URL(request.url).origin

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/callback`,
    },
  })

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  return NextResponse.redirect(data.url)
}

export async function GET(request: Request) {
  return handleGoogleAuth(request)
}

export async function POST(request: Request) {
  return handleGoogleAuth(request)
}
