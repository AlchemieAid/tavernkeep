/**
 * Serverless-Optimized Rate Limiting
 *
 * Architecture for Vercel serverless:
 * - In-memory cache with 30s TTL per user/type (no cold start penalty on cache hit)
 * - Lazy DB writes (log usage async after successful generation)
 * - Optimistic allowance with catch-up enforcement
 * - Fail open on any error
 */

interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
}

// Generous limits
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  campaign: { maxRequests: 10, windowMinutes: 60 },
  town: { maxRequests: 50, windowMinutes: 60 },
  shop: { maxRequests: 100, windowMinutes: 60 },
  item: { maxRequests: 200, windowMinutes: 60 },
}

// In-memory cache with TTL (survives across warm invocations in same region)
interface CacheEntry {
  count: number
  expiresAt: number
}
const rateLimitCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30000 // 30 seconds

function getCacheKey(userId: string, type: string): string {
  return `${userId}:${type}`
}

function getCachedCount(userId: string, type: string): number | null {
  const key = getCacheKey(userId, type)
  const entry = rateLimitCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    rateLimitCache.delete(key)
    return null
  }
  return entry.count
}

function setCachedCount(userId: string, type: string, count: number): void {
  const key = getCacheKey(userId, type)
  rateLimitCache.set(key, { count, expiresAt: Date.now() + CACHE_TTL_MS })
}

function incrementCachedCount(userId: string, type: string): void {
  const current = getCachedCount(userId, type) || 0
  setCachedCount(userId, type, current + 1)
}

/**
 * Quick rate limit check - uses in-memory cache first
 * Fast path: ~1ms cache hit. Slow path: 500ms DB query.
 */
export async function checkRateLimit(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  supabase?: any
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  if (process.env.DISABLE_RATE_LIMITS === 'true') {
    return { allowed: true, remaining: 9999, message: 'Rate limits disabled (testing mode)' }
  }

  const config = RATE_LIMITS[generationType]

  // Fast path: check in-memory cache
  const cachedCount = getCachedCount(userId, generationType)
  if (cachedCount !== null) {
    const remaining = Math.max(0, config.maxRequests - cachedCount)
    const allowed = cachedCount < config.maxRequests
    return {
      allowed,
      remaining,
      message: allowed
        ? `${remaining} ${generationType}s remaining (cached)`
        : `Limit reached: ${config.maxRequests} ${generationType}s per ${config.windowMinutes}min`,
    }
  }

  // Slow path: check DB with 500ms timeout
  const timeoutPromise = new Promise<{ allowed: boolean; remaining: number; message: string }>((resolve) => {
    setTimeout(() => resolve({ allowed: true, remaining: 999, message: 'Rate limit check skipped (timeout)' }), 500)
  })

  return Promise.race([doRateLimitCheck(userId, generationType, config, supabase), timeoutPromise])
}

async function doRateLimitCheck(
  userId: string,
  generationType: string,
  config: RateLimitConfig,
  supabase?: any
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  try {
    if (!supabase) {
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
    }

    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000)
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
    setCachedCount(userId, generationType, requestCount)

    const remaining = Math.max(0, config.maxRequests - requestCount)
    const allowed = requestCount < config.maxRequests

    return {
      allowed,
      remaining,
      message: allowed
        ? `${remaining} ${generationType}s remaining`
        : `Limit reached: ${config.maxRequests} ${generationType}s per ${config.windowMinutes}min`,
    }
  } catch (err) {
    console.warn('[RATE-LIMIT] Error, failing open:', (err as Error).message)
    return { allowed: true, remaining: 999, message: 'Rate limit check failed, allowing request' }
  }
}

interface UsageMetadata {
  prompt: string
  tokensUsed: number
  inputTokens?: number
  outputTokens?: number
  estimatedCost?: number
  model?: string
}

/**
 * Record usage - call this AFTER successful generation
 * Updates cache immediately, writes to DB async (fire-and-forget)
 */
export async function recordUsage(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  metadata: UsageMetadata,
  supabase?: any
): Promise<void> {
  incrementCachedCount(userId, generationType)

  try {
    if (!supabase) {
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
    }

    // Fire-and-forget: don't await, let it complete in background
    void supabase.from('ai_usage').insert({
      dm_id: userId,
      generation_type: generationType,
      prompt: metadata.prompt,
      tokens_used: metadata.tokensUsed,
      input_tokens: metadata.inputTokens,
      output_tokens: metadata.outputTokens,
      estimated_cost: metadata.estimatedCost,
      model: metadata.model,
    }).then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('[RATE-LIMIT] Failed to log usage:', error.message)
    })
  } catch (err) {
    console.warn('[RATE-LIMIT] Failed to log usage:', (err as Error).message)
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
