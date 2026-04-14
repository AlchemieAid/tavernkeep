/**
 * AI response caching system
 * Reduces API calls by caching common prompts and responses
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

interface CacheOptions {
  ttlSeconds?: number
  namespace?: string
  skipCache?: boolean
}

/**
 * Generate a cache key from a prompt and options
 */
function generateCacheKey(prompt: string, namespace = 'default'): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${namespace}:${prompt}`)
    .digest('hex')
  return hash.substring(0, 32) // Use first 32 chars for readability
}

/**
 * Get cached response or generate new one
 * @param cacheKey Unique identifier for this cache entry
 * @param generateFn Function to generate the response if not cached
 * @param options Cache configuration
 * @returns Cached or newly generated response
 */
export async function getCachedOrGenerate<T>(
  cacheKey: string,
  generateFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    ttlSeconds = 3600, // 1 hour default
    skipCache = false,
  } = options

  if (skipCache) {
    return await generateFn()
  }

  const supabase = await createClient()

  try {
    // Check cache
    const { data: cached, error } = await supabase
      .from('ai_cache')
      .select('response, created_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (!error && cached) {
      const age = Date.now() - new Date(cached.created_at).getTime()
      if (age < ttlSeconds * 1000) {
        console.log(`[Cache] Hit for key: ${cacheKey.substring(0, 8)}...`)
        return JSON.parse(cached.response) as T
      } else {
        console.log(`[Cache] Expired for key: ${cacheKey.substring(0, 8)}...`)
        // Delete expired entry
        await supabase.from('ai_cache').delete().eq('cache_key', cacheKey)
      }
    }
  } catch (error) {
    console.warn('[Cache] Error reading cache:', error)
    // Continue to generate if cache read fails
  }

  // Generate new response
  console.log(`[Cache] Miss for key: ${cacheKey.substring(0, 8)}...`)
  const result = await generateFn()

  // Store in cache (fire and forget)
  try {
    await supabase
      .from('ai_cache')
      .upsert({
        cache_key: cacheKey,
        response: JSON.stringify(result),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
  } catch (error) {
    console.warn('[Cache] Error writing cache:', error)
    // Don't fail if cache write fails
  }

  return result
}

/**
 * Cache AI generation with automatic key generation
 * @param prompt The prompt to cache
 * @param generateFn Function to generate the response
 * @param options Cache configuration
 * @returns Cached or newly generated response
 */
export async function cacheAIGeneration<T>(
  prompt: string,
  generateFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { namespace = 'ai-generation', ...rest } = options
  const cacheKey = generateCacheKey(prompt, namespace)
  return getCachedOrGenerate(cacheKey, generateFn, { namespace, ...rest })
}

/**
 * Invalidate cache entries
 * @param pattern Pattern to match cache keys (SQL LIKE pattern)
 */
export async function invalidateCache(pattern?: string): Promise<number> {
  const supabase = await createClient()

  try {
    if (pattern) {
      const { data, error } = await supabase
        .from('ai_cache')
        .delete()
        .like('cache_key', pattern)
        .select()

      if (error) throw error
      return data?.length || 0
    } else {
      // Clear all cache
      const { data, error } = await supabase
        .from('ai_cache')
        .delete()
        .neq('cache_key', '') // Delete all
        .select()

      if (error) throw error
      return data?.length || 0
    }
  } catch (error) {
    console.error('[Cache] Error invalidating cache:', error)
    return 0
  }
}

/**
 * Clean up expired cache entries
 * @param olderThanSeconds Delete entries older than this many seconds
 * @returns Number of entries deleted
 */
export async function cleanExpiredCache(olderThanSeconds = 86400): Promise<number> {
  const supabase = await createClient()

  try {
    const cutoffDate = new Date(Date.now() - olderThanSeconds * 1000).toISOString()

    const { data, error } = await supabase
      .from('ai_cache')
      .delete()
      .lt('created_at', cutoffDate)
      .select()

    if (error) throw error

    const count = data?.length || 0
    if (count > 0) {
      console.log(`[Cache] Cleaned ${count} expired entries`)
    }
    return count
  } catch (error) {
    console.error('[Cache] Error cleaning expired cache:', error)
    return 0
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const supabase = await createClient()

  try {
    const { count: totalEntries } = await supabase
      .from('ai_cache')
      .select('*', { count: 'exact', head: true })

    const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
    const { count: recentEntries } = await supabase
      .from('ai_cache')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    return {
      totalEntries: totalEntries || 0,
      recentEntries: recentEntries || 0,
      oldEntries: (totalEntries || 0) - (recentEntries || 0),
    }
  } catch (error) {
    console.error('[Cache] Error getting cache stats:', error)
    return {
      totalEntries: 0,
      recentEntries: 0,
      oldEntries: 0,
    }
  }
}
