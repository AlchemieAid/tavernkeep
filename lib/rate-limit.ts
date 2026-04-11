interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  campaign: { maxRequests: 5, windowMinutes: 60 }, // 5 campaigns per hour
  town: { maxRequests: 10, windowMinutes: 60 },    // 10 towns per hour
  shop: { maxRequests: 20, windowMinutes: 60 },    // 20 shops per hour
  item: { maxRequests: 50, windowMinutes: 60 },    // 50 items per hour
}

// Simple request-level cache to avoid repeated DB queries during one generation session
const rateLimitCache = new Map<string, { count: number; timestamp: number }>()

export async function checkRateLimit(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  supabase?: any // Optional: pass existing client to avoid creating new one
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; message: string }> {
  const startTime = Date.now()
  console.log(`[RATE-LIMIT] Starting check for ${generationType}...`)
  
  const cacheKey = `${userId}:${generationType}`
  const cached = rateLimitCache.get(cacheKey)
  const config = RATE_LIMITS[generationType]
  
  // Use cached result if from last 5 seconds (within same request)
  if (cached && (Date.now() - cached.timestamp) < 5000) {
    console.log(`[RATE-LIMIT] Using cached result for ${generationType}: ${cached.count} used`)
    const remaining = Math.max(0, config.maxRequests - cached.count)
    return {
      allowed: cached.count < config.maxRequests,
      remaining,
      resetAt: new Date(Date.now() + config.windowMinutes * 60 * 1000),
      message: remaining > 0 
        ? `You have ${remaining} ${generationType} generations remaining.`
        : `Rate limit exceeded for ${generationType}.`
    }
  }
  
  // Lazy import only if needed
  if (!supabase) {
    console.log(`[RATE-LIMIT] Creating new Supabase client...`)
    const { createClient } = await import('@/lib/supabase/server')
    supabase = await createClient()
    console.log(`[RATE-LIMIT] Supabase client created in ${Date.now() - startTime}ms`)
  }
  
  console.log(`[RATE-LIMIT] Querying ai_usage table...`)
  
  // Calculate time window
  const windowStart = new Date()
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes)

  // Count requests in the current window
  const { data, error } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('dm_id', userId)
    .eq('generation_type', generationType)
    .gte('created_at', windowStart.toISOString())

  if (error) {
    console.error('[RATE-LIMIT] Database error:', error)
    // Fail open - allow the request if we can't check
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMinutes * 60 * 1000),
      message: `You have ${config.maxRequests} ${generationType} generations remaining.`
    }
  }

  const requestCount = data?.length || 0
  console.log(`[RATE-LIMIT] Query complete: ${requestCount} requests found in ${Date.now() - startTime}ms`)
  
  // Cache the result
  rateLimitCache.set(cacheKey, { count: requestCount, timestamp: Date.now() })
  
  const remaining = Math.max(0, config.maxRequests - requestCount)
  const resetAt = new Date(Date.now() + config.windowMinutes * 60 * 1000)

  const allowed = requestCount < config.maxRequests
  
  console.log(`[RATE-LIMIT] Result for ${generationType}: ${allowed ? 'ALLOWED' : 'BLOCKED'} (${remaining} remaining)`)
  
  return {
    allowed,
    remaining,
    resetAt,
    message: allowed 
      ? `You have ${remaining} ${generationType} generations remaining.`
      : `Rate limit exceeded. You can generate ${remaining} more ${generationType}s. Resets at ${resetAt.toLocaleTimeString()}.`
  }
}
