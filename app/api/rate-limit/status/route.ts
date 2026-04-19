/**
 * Rate Limit Status API
 * 
 * Returns current rate limit status for the authenticated user.
 * Also serves as a database warmup call since it queries ai_usage table.
 * 
 * @route GET /api/rate-limit/status
 * @returns {Object} Rate limit status with remaining requests
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check rate limit for campaigns (this warms up the database)
    const campaignStatus = await checkRateLimit(user.id, 'campaign', supabase)
    
    // Check other generation types
    const [townStatus, shopStatus] = await Promise.all([
      checkRateLimit(user.id, 'town', supabase),
      checkRateLimit(user.id, 'shop', supabase)
    ])
    
    const totalTime = Date.now() - startTime
    console.log(`[RATE-LIMIT-STATUS] Retrieved in ${totalTime}ms for user ${user.id}`)
    
    return NextResponse.json({
      campaign: {
        remaining: campaignStatus.remaining,
        max: 10,
        allowed: campaignStatus.allowed
      },
      town: {
        remaining: townStatus.remaining,
        max: 20,
        allowed: townStatus.allowed
      },
      shop: {
        remaining: shopStatus.remaining,
        max: 50,
        allowed: shopStatus.allowed
      },
      userId: user.id,
      dbTime: totalTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[RATE-LIMIT-STATUS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve rate limit status' },
      { status: 500 }
    )
  }
}
