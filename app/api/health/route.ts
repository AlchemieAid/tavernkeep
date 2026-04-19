/**
 * Health Check API
 * 
 * Lightweight endpoint to keep Supabase connection warm.
 * Called by frontend every 2 minutes while user is on DM pages.
 * 
 * @route GET /api/health
 * @returns {Object} Health status and timestamp
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Light database ping to keep connection warm
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1)
    
    const dbTime = Date.now() - startTime
    
    if (error) {
      console.error('[HEALTH] Database ping failed:', error)
      return NextResponse.json(
        { status: 'degraded', dbTime, error: error.message },
        { status: 503 }
      )
    }
    
    console.log(`[HEALTH] Database warm ping completed in ${dbTime}ms`)
    
    return NextResponse.json({
      status: 'healthy',
      dbTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[HEALTH] Unexpected error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    )
  }
}
