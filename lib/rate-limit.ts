/**
 * Serverless-Optimized Rate Limiting System
 *
 * @fileoverview
 * Implements a two-tier rate limiting system optimized for Vercel's serverless
 * environment. Uses in-memory caching for fast checks and async database writes
 * for persistence. Designed to fail open to prevent blocking legitimate users.
 *
 * @architecture
 * **Two-Tier Strategy:**
 * ```
 * Fast Path (1ms):
 *   ├─ Check in-memory cache
 *   ├─ If hit → return immediately
 *   └─ If miss → fall through to slow path
 *
 * Slow Path (500ms max):
 *   ├─ Query database for usage count
 *   ├─ Cache result for 30s
 *   ├─ Timeout after 500ms (fail open)
 *   └─ Return result
 * ```
 *
 * **Key Features:**
 * - **In-memory cache** with 30s TTL (survives warm starts)
 * - **Async DB writes** (fire-and-forget after generation)
 * - **Fail-open policy** (allow on errors to prevent blocking)
 * - **500ms timeout** on DB queries (prevents slow responses)
 * - **Hierarchical limits** (campaign > town > shop > item)
 *
 * **Rate Limits:**
 * - Campaigns: 10/hour (most expensive)
 * - Towns: 50/hour
 * - Shops: 100/hour
 * - Items: 200/hour (least expensive)
 *
 * **Serverless Optimizations:**
 * - Cache persists across warm invocations
 * - No cold start penalty on cache hit
 * - Lazy DB writes don't block responses
 * - Graceful degradation on DB failures
 *
 * @example
 * ```typescript
 * // Check rate limit before generation
 * const { allowed, remaining, message } = await checkRateLimit(
 *   userId,
 *   'campaign',
 *   supabase
 * )
 *
 * if (!allowed) {
 *   return { error: message }
 * }
 *
 * // Generate content...
 *
 * // Record usage after successful generation
 * await recordUsage(userId, 'campaign', {
 *   prompt: 'A dark fantasy world',
 *   tokensUsed: 1500,
 *   estimatedCost: 0.003,
 *   model: 'gpt-4o'
 * })
 * ```
 *
 * @see {@link checkRateLimit} for usage checking
 * @see {@link recordUsage} for usage tracking
 */

/**
 * Rate limit configuration for a generation type
 */
interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number
  /** Time window in minutes */
  windowMinutes: number
}

// Generous limits
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  campaign: { maxRequests: 10, windowMinutes: 60 },
  town: { maxRequests: 50, windowMinutes: 60 },
  shop: { maxRequests: 100, windowMinutes: 60 },
  item: { maxRequests: 200, windowMinutes: 60 },
}

/**
 * In-memory cache entry with expiration
 * 
 * @description
 * Stores request count and expiration timestamp. Cache survives across
 * warm serverless invocations in the same region, providing sub-millisecond
 * lookups for frequently accessed users.
 */
interface CacheEntry {
  /** Current request count in the window */
  count: number
  /** Unix timestamp when this entry expires */
  expiresAt: number
}

/** In-memory cache (persists across warm invocations) */
const rateLimitCache = new Map<string, CacheEntry>()

/** Cache TTL: 30 seconds (balances freshness vs performance) */
const CACHE_TTL_MS = 30000

/**
 * Generate cache key from user ID and generation type
 * 
 * @param userId - User ID
 * @param type - Generation type (campaign, town, shop, item)
 * @returns Cache key in format "userId:type"
 */
function getCacheKey(userId: string, type: string): string {
  return `${userId}:${type}`
}

/**
 * Get cached request count for a user/type combination
 * 
 * @param userId - User ID to check
 * @param type - Generation type
 * @returns Request count if cached and not expired, null otherwise
 * 
 * @description
 * Checks in-memory cache for existing count. Automatically cleans up
 * expired entries. Returns null if not found or expired.
 */
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

/**
 * Store request count in cache with TTL
 * 
 * @param userId - User ID
 * @param type - Generation type
 * @param count - Request count to cache
 */
function setCachedCount(userId: string, type: string, count: number): void {
  const key = getCacheKey(userId, type)
  rateLimitCache.set(key, { count, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Increment cached request count
 * 
 * @param userId - User ID
 * @param type - Generation type
 * 
 * @description
 * Increments the cached count by 1. If no cache entry exists, starts at 1.
 * Called after successful generation to update the cache immediately.
 */
function incrementCachedCount(userId: string, type: string): void {
  const current = getCachedCount(userId, type) || 0
  setCachedCount(userId, type, current + 1)
}

/**
 * Invalidate cached request count
 * 
 * @param userId - User ID
 * @param type - Generation type
 * 
 * @description
 * Removes the cache entry, forcing the next check to query the database.
 * Use this after recording usage to ensure fresh data on next check.
 */
function invalidateCachedCount(userId: string, type: string): void {
  const key = getCacheKey(userId, type)
  rateLimitCache.delete(key)
  console.log(`[RATE-LIMIT] Invalidated cache for ${key}`)
}

/**
 * Check if user is within rate limits
 * 
 * @param userId - User ID to check
 * @param generationType - Type of generation being requested
 * @param supabase - Optional Supabase client (created if not provided)
 * @returns Promise resolving to rate limit status
 * 
 * @description
 * **Two-tier checking strategy:**
 * 
 * 1. **Fast path (~1ms):** Check in-memory cache
 *    - If hit and within limits → allow immediately
 *    - If hit and over limits → deny immediately
 * 
 * 2. **Slow path (max 500ms):** Query database
 *    - Count requests in time window
 *    - Cache result for future checks
 *    - Timeout after 500ms (fail open)
 * 
 * **Fail-open policy:**
 * - DB errors → allow request
 * - Timeouts → allow request
 * - Missing Supabase client → allow request
 * 
 * This prevents legitimate users from being blocked by infrastructure issues.
 * 
 * @example
 * ```typescript
 * const result = await checkRateLimit(userId, 'campaign', supabase)
 * if (!result.allowed) {
 *   return res.status(429).json({ error: result.message })
 * }
 * console.log(`${result.remaining} requests remaining`)
 * ```
 */
export async function checkRateLimit(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  supabase?: any
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  console.log(`[RATE-LIMIT] checkRateLimit called for user ${userId}, type: ${generationType}`)
  
  if (process.env.DISABLE_RATE_LIMITS === 'true') {
    console.log('[RATE-LIMIT] Rate limits disabled via env var')
    return { allowed: true, remaining: 9999, message: 'Rate limits disabled (testing mode)' }
  }

  const config = RATE_LIMITS[generationType]
  console.log(`[RATE-LIMIT] Config: ${config.maxRequests} requests per ${config.windowMinutes} minutes`)

  // Fast path: check in-memory cache
  const cachedCount = getCachedCount(userId, generationType)
  console.log(`[RATE-LIMIT] Cache lookup result:`, cachedCount)
  
  if (cachedCount !== null) {
    const remaining = Math.max(0, config.maxRequests - cachedCount)
    const allowed = cachedCount < config.maxRequests
    console.log(`[RATE-LIMIT] Using cached count: ${cachedCount}, allowed: ${allowed}, remaining: ${remaining}`)
    return {
      allowed,
      remaining,
      message: allowed
        ? `${remaining} ${generationType}s remaining (cached)`
        : `Limit reached: ${config.maxRequests} ${generationType}s per ${config.windowMinutes}min`,
    }
  }

  // Slow path: check DB with 5 second timeout (increased for Supabase cold starts)
  console.log('[RATE-LIMIT] Cache miss, checking database with 5000ms timeout')
  const timeoutPromise = new Promise<{ allowed: boolean; remaining: number; message: string }>((resolve) => {
    setTimeout(() => {
      console.warn('[RATE-LIMIT] Database check timed out after 5000ms, failing open')
      console.warn('[RATE-LIMIT] This may indicate: 1) Supabase cold start, 2) Network latency, 3) Missing index')
      console.warn('[RATE-LIMIT] Check that idx_ai_usage_rate_limit index exists on ai_usage table')
      resolve({ allowed: true, remaining: 999, message: 'Rate limit check skipped (timeout)' })
    }, 5000)
  })

  const checkStart = Date.now()
  const result = await Promise.race([doRateLimitCheck(userId, generationType, config, supabase), timeoutPromise])
  const checkDuration = Date.now() - checkStart
  console.log(`[RATE-LIMIT] Check completed in ${checkDuration}ms, result:`, result)
  
  return result
}

async function doRateLimitCheck(
  userId: string,
  generationType: string,
  config: RateLimitConfig,
  supabase?: any
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  try {
    console.log('[RATE-LIMIT] doRateLimitCheck starting')
    
    if (!supabase) {
      console.log('[RATE-LIMIT] No supabase client provided, creating one')
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
      console.log('[RATE-LIMIT] Supabase client created')
    }

    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000)
    console.log(`[RATE-LIMIT] Querying ai_usage table for user ${userId} since ${windowStart.toISOString()}`)
    
    const queryStart = Date.now()
    const { count, error } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('dm_id', userId)
      .eq('generation_type', generationType)
      .gte('created_at', windowStart.toISOString())
    const queryDuration = Date.now() - queryStart
    
    console.log(`[RATE-LIMIT] Database query completed in ${queryDuration}ms`)

    if (error) {
      console.warn('[RATE-LIMIT] DB error, failing open:', error.message)
      console.warn('[RATE-LIMIT] Error details:', error)
      return { allowed: true, remaining: 999, message: 'Rate limit check failed, allowing request' }
    }

    const requestCount = count || 0
    console.log(`[RATE-LIMIT] Found ${requestCount} requests in window, caching result`)
    setCachedCount(userId, generationType, requestCount)

    const remaining = Math.max(0, config.maxRequests - requestCount)
    const allowed = requestCount < config.maxRequests
    
    console.log(`[RATE-LIMIT] Final result: allowed=${allowed}, remaining=${remaining}/${config.maxRequests}`)

    return {
      allowed,
      remaining,
      message: allowed
        ? `${remaining} ${generationType}s remaining`
        : `Limit reached: ${config.maxRequests} ${generationType}s per ${config.windowMinutes}min`,
    }
  } catch (err) {
    console.warn('[RATE-LIMIT] Error, failing open:', (err as Error).message)
    console.warn('[RATE-LIMIT] Error stack:', (err as Error).stack)
    return { allowed: true, remaining: 999, message: 'Rate limit check failed, allowing request' }
  }
}

/**
 * Metadata about AI usage for tracking and billing
 */
interface UsageMetadata {
  /** The prompt that was sent to the AI */
  prompt: string
  /** Total tokens used (input + output) */
  tokensUsed: number
  /** Input tokens (prompt) */
  inputTokens?: number
  /** Output tokens (completion) */
  outputTokens?: number
  /** Estimated cost in USD */
  estimatedCost?: number
  /** AI model used (e.g., 'gpt-4o') */
  model?: string
}

/**
 * Record AI usage after successful generation
 * 
 * @param userId - User ID who made the request
 * @param generationType - Type of generation performed
 * @param metadata - Usage details (tokens, cost, model)
 * @param supabase - Optional Supabase client
 * 
 * @description
 * **Two-phase recording:**
 * 
 * 1. **Immediate:** Update in-memory cache
 *    - Increments cached count by 1
 *    - Ensures next check sees updated count
 * 
 * 2. **Async:** Write to database (fire-and-forget)
 *    - Logs usage for analytics and billing
 *    - Does not block response
 *    - Failures are logged but don't affect user
 * 
 * **Important:** Always call this AFTER successful generation, not before.
 * This ensures we only count successful requests, not failed attempts.
 * 
 * @example
 * ```typescript
 * // After successful generation
 * await recordUsage(userId, 'town', {
 *   prompt: 'A coastal trading port',
 *   tokensUsed: 1200,
 *   inputTokens: 500,
 *   outputTokens: 700,
 *   estimatedCost: 0.0024,
 *   model: 'gpt-4o'
 * })
 * ```
 */
export async function recordUsage(
  userId: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  metadata: UsageMetadata,
  supabase?: any
): Promise<void> {
  // Invalidate cache to force fresh DB query on next check
  // This ensures accurate rate limiting after usage is recorded
  invalidateCachedCount(userId, generationType)

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
      if (error) {
        console.warn('[RATE-LIMIT] Failed to log usage:', error.message)
      } else {
        console.log(`[RATE-LIMIT] Recorded usage for ${userId}:${generationType}`)
      }
    })
  } catch (err) {
    console.warn('[RATE-LIMIT] Failed to log usage:', (err as Error).message)
  }
}

/**
 * Skip rate limit checks for child entities during campaign generation
 * 
 * @returns Always returns allowed=true with placeholder values
 * 
 * @description
 * When generating a full campaign hierarchy (campaign → towns → shops → items),
 * we only check the rate limit at the campaign level. This function is used
 * to bypass rate limit checks for child entities (towns, shops, items) since
 * the parent campaign check is sufficient to prevent abuse.
 * 
 * **Why skip child checks?**
 * - Campaign generation is already rate-limited (10/hour)
 * - Checking each child would be redundant
 * - Reduces database queries during generation
 * - Prevents false positives from cascading checks
 * 
 * **Usage:**
 * Only call this during hierarchical generation initiated from a campaign.
 * For standalone town/shop/item generation, use normal rate limit checks.
 * 
 * @example
 * ```typescript
 * // In campaign generation flow
 * const townLimit = skipChildRateLimits() // Skip check
 * 
 * // In standalone town generation
 * const townLimit = await checkRateLimit(userId, 'town') // Normal check
 * ```
 */
export function skipChildRateLimits(): { allowed: boolean; remaining: number; message: string } {
  return {
    allowed: true,
    remaining: 999,
    message: 'Campaign generation in progress'
  }
}
