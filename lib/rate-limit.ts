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

export async function checkRateLimit(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  supabase?: any // Optional: pass existing client to avoid creating new one
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; message: string }> {
  // Lazy import only if needed
  if (!supabase) {
    const { createClient } = await import('@/lib/supabase/server')
    supabase = await createClient()
  }
  
  const config = RATE_LIMITS[generationType]
  
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
    console.error('Rate limit check error:', error)
    // Fail open - allow the request if we can't check
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMinutes * 60 * 1000),
      message: `You have ${config.maxRequests} ${generationType} generations remaining.`
    }
  }

  const requestCount = data?.length || 0
  const remaining = Math.max(0, config.maxRequests - requestCount)
  const resetAt = new Date(Date.now() + config.windowMinutes * 60 * 1000)

  const allowed = requestCount < config.maxRequests
  
  return {
    allowed,
    remaining,
    resetAt,
    message: allowed 
      ? `You have ${remaining} ${generationType} generations remaining.`
      : `Rate limit exceeded. You can generate ${remaining} more ${generationType}s. Resets at ${resetAt.toLocaleTimeString()}.`
  }
}
