/**
 * Simplified Rate Limiting
 * 
 * Architecture:
 * - Only check rate limits at campaign level during full generation
 * - Skip all child entity checks (towns, shops, items) during campaign generation
 * - For standalone generation, use quick checks with aggressive timeouts
 * - Fail open (allow) on any error or timeout - never block the user
 */

interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
}

// Generous limits - prevent abuse while allowing normal use
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  campaign: { maxRequests: 10, windowMinutes: 60 },  // 10 campaigns/hour
  town: { maxRequests: 50, windowMinutes: 60 },       // 50 towns/hour (standalone)
  shop: { maxRequests: 100, windowMinutes: 60 },     // 100 shops/hour (standalone)
  item: { maxRequests: 200, windowMinutes: 60 },     // 200 items/hour (standalone)
}

/**
 * Quick rate limit check with 1.5s timeout
 * Returns immediately with allowed=true if anything goes wrong (fail open)
 */
export async function checkRateLimit(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  supabase?: any
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  // Bypass rate limits for testing when env var is set
  if (process.env.DISABLE_RATE_LIMITS === 'true') {
    return { allowed: true, remaining: 9999, message: 'Rate limits disabled (testing mode)' }
  }

  const config = RATE_LIMITS[generationType]
  
  // Create a timeout promise
  const timeoutPromise = new Promise<{ allowed: boolean; remaining: number; message: string }>((resolve) => {
    setTimeout(() => {
      resolve({
        allowed: true,
        remaining: 999,
        message: 'Rate limit check skipped (timeout)'
      })
    }, 1500) // 1.5 second max wait
  })
  
  // Race between actual check and timeout
  return Promise.race([
    doRateLimitCheck(userId, generationType, config, supabase),
    timeoutPromise
  ])
}

/**
 * Internal rate limit check - returns quickly or errors
 */
async function doRateLimitCheck(
  userId: string,
  generationType: string,
  config: RateLimitConfig,
  supabase?: any
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  try {
    // Get supabase client if not provided
    if (!supabase) {
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
    }
    
    // Calculate window start
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000)
    
    // Fast count query
    const { count, error } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('dm_id', userId)
      .eq('generation_type', generationType)
      .gte('created_at', windowStart.toISOString())
      
    if (error) {
      console.warn('[RATE-LIMIT] DB error, failing open:', error.message)
      return { allowed: true, remaining: 999, message: 'Rate limit check failed, allowing request' }
    }
    
    const requestCount = count || 0
    const remaining = Math.max(0, config.maxRequests - requestCount)
    const allowed = requestCount < config.maxRequests
    
    return {
      allowed,
      remaining,
      message: allowed
        ? `${remaining} ${generationType}s remaining`
        : `Limit reached: ${config.maxRequests} ${generationType}s per ${config.windowMinutes}min`
    }
  } catch (err) {
    console.warn('[RATE-LIMIT] Error, failing open:', (err as Error).message)
    return { allowed: true, remaining: 999, message: 'Rate limit check failed, allowing request' }
  }
}

/**
 * For campaign generation: Skip all child rate limit checks
 * The campaign-level check is sufficient to prevent abuse
 */
export function skipChildRateLimits(): { allowed: boolean; remaining: number; message: string } {
  return {
    allowed: true,
    remaining: 999,
    message: 'Campaign generation in progress'
  }
}
