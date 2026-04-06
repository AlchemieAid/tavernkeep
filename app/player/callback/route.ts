import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}/player/login?error=auth_failed`)
    }

    // Check if player profile exists, if not redirect to profile creation
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!player) {
        // First time login - redirect to profile creation
        return NextResponse.redirect(`${requestUrl.origin}/player/profile/create`)
      }

      // Player exists - redirect to campaigns list
      return NextResponse.redirect(`${requestUrl.origin}/player/campaigns`)
    }
  }

  // Fallback redirect
  return NextResponse.redirect(`${requestUrl.origin}/player/login`)
}
