interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  campaign: { maxRequests: 5, windowMinutes: 60 }, // 5 campaigns per hour
  town: { maxRequests: 100, windowMinutes: 60 },    // 100 towns per hour (generous for batch generation)
  shop: { maxRequests: 200, windowMinutes: 60 },    // 200 shops per hour
  item: { maxRequests: 500, windowMinutes: 60 },    // 500 items per hour
}

// Simple request-level cache to avoid repeated DB queries during one generation session
const rateLimitCache = new Map<string, { count: number; timestamp: number }>()

// Track if we're in a campaign generation session - if so, skip child rate limits
let campaignGenerationActive = false
let campaignGenerationStartTime = 0

export function setCampaignGenerationActive(active: boolean) {
  campaignGenerationActive = active
  if (active) {
    campaignGenerationStartTime = Date.now()
    // Clear cache when starting new generation
    rateLimitCache.clear()
  }
  console.log(`[RATE-LIMIT] Campaign generation active: ${active}`)
}

export async function checkRateLimit(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  supabase?: any // Optional: pass existing client to avoid creating new one
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; message: string }> {
  const startTime = Date.now()
  
  // Skip rate limit checks for child entities during campaign generation (trust campaign-level check)
  if (campaignGenerationActive && generationType !== 'campaign') {
    const sessionAge = Date.now() - campaignGenerationStartTime
    // Only skip for 10 minutes after campaign generation starts
    if (sessionAge < 10 * 60 * 1000) {
      console.log(`[RATE-LIMIT] Skipping ${generationType} check during campaign generation session`)
      return {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60 * 60 * 1000),
        message: `Campaign generation in progress - ${generationType} allowed`
      }
    }
  }
  
  console.log(`[RATE-LIMIT] Starting check for ${generationType}...`)
  
  const cacheKey = `${userId}:${generationType}`
  const cached = rateLimitCache.get(cacheKey)
  const config = RATE_LIMITS[generationType]
  
  // Use cached result if from last 30 seconds (within same request)
  if (cached && (Date.now() - cached.timestamp) < 30000) {
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
