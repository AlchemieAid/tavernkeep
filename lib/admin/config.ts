/**
 * Admin Configuration Management
 * 
 * @fileoverview
 * Provides cached access to dynamic application configuration.
 * Implements 5-minute in-memory caching for performance.
 * 
 * @features
 * - In-memory caching with TTL
 * - Type-safe config access
 * - Automatic cache invalidation
 * - Fallback to defaults
 * - Version tracking
 * 
 * @performance
 * - Cached reads: <1ms
 * - Uncached reads: ~50ms
 * - Cache TTL: 5 minutes
 * - Survives warm serverless invocations
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './auth'

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
  version: number
}

/**
 * In-memory config cache
 * Persists across warm serverless invocations
 */
const configCache = new Map<string, CacheEntry<any>>()

/**
 * Cache TTL: 5 minutes
 * Balances freshness with performance
 */
const CONFIG_TTL_MS = 5 * 60 * 1000

/**
 * Get configuration value with caching
 * 
 * @param key - Configuration key
 * @param defaultValue - Fallback value if config not found
 * @returns Configuration value
 * 
 * @description
 * **Two-tier lookup:**
 * 1. Check in-memory cache (fast path, <1ms)
 * 2. Query database if cache miss (slow path, ~50ms)
 * 
 * Results are cached for 5 minutes to minimize database queries.
 * 
 * @example
 * ```typescript
 * const rateLimit = await getConfig('rate_limit_campaign', {
 *   maxRequests: 10,
 *   windowMinutes: 60
 * })
 * ```
 */
export async function getConfig<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  // Fast path: check cache
  const cached = configCache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value as T
  }

  // Slow path: query database
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('app_config')
    .select('value, version')
    .eq('key', key)
    .single()

  if (error || !data) {
    // Cache the default value to avoid repeated DB queries
    configCache.set(key, {
      value: defaultValue,
      expiresAt: Date.now() + CONFIG_TTL_MS,
      version: 0,
    })
    return defaultValue
  }

  // Cache the result
  const value = data.value as T
  configCache.set(key, {
    value,
    expiresAt: Date.now() + CONFIG_TTL_MS,
    version: data.version,
  })

  return value
}

/**
 * Get all configs in a category
 * 
 * @param category - Config category
 * @returns Array of config entries
 * 
 * @description
 * Fetches all configs in a category (e.g., 'rate_limits', 'features').
 * Used by admin UI to display config groups.
 */
export async function getConfigsByCategory(
  category: string
): Promise<Array<{
  key: string
  value: any
  description: string | null
  version: number
}>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value, description, version')
    .eq('category', category)
    .order('key')

  if (error) {
    console.error('Error fetching configs:', error)
    return []
  }

  return data || []
}

/**
 * Update configuration value
 * 
 * @param key - Configuration key
 * @param value - New value
 * @returns Success status
 * @throws Redirects if not admin
 * 
 * @description
 * Updates config value and invalidates cache.
 * Only config_admin or super_admin can update configs.
 * Automatically increments version and records change in history.
 * 
 * @example
 * ```typescript
 * await updateConfig('rate_limit_campaign', {
 *   maxRequests: 20,
 *   windowMinutes: 60
 * })
 * ```
 */
export async function updateConfig(
  key: string,
  value: any
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin('config_admin')

  const supabase = await createClient()
  
  // Get current version
  const { data: current } = await supabase
    .from('app_config')
    .select('version')
    .eq('key', key)
    .single()

  const newVersion = (current?.version || 0) + 1

  // Update config
  const { error } = await supabase
    .from('app_config')
    .update({
      value,
      updated_by: admin.userId,
      updated_at: new Date().toISOString(),
      version: newVersion,
    })
    .eq('key', key)

  if (error) {
    return { success: false, error: error.message }
  }

  // Invalidate cache
  invalidateConfigCache(key)

  return { success: true }
}

/**
 * Create new configuration
 * 
 * @param key - Configuration key
 * @param value - Configuration value
 * @param description - Description of config
 * @param category - Config category
 * @returns Success status
 * @throws Redirects if not admin
 */
export async function createConfig(
  key: string,
  value: any,
  description: string,
  category: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin('config_admin')

  const supabase = await createClient()
  const { error } = await supabase
    .from('app_config')
    .insert({
      key,
      value,
      description,
      category,
      updated_by: admin.userId,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete configuration
 * 
 * @param key - Configuration key
 * @returns Success status
 * @throws Redirects if not super admin
 * 
 * @description
 * Only super admins can delete configs.
 * Use with caution - may break application if critical config is deleted.
 */
export async function deleteConfig(
  key: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin('super_admin')

  const supabase = await createClient()
  const { error } = await supabase
    .from('app_config')
    .delete()
    .eq('key', key)

  if (error) {
    return { success: false, error: error.message }
  }

  // Invalidate cache
  invalidateConfigCache(key)

  return { success: true }
}

/**
 * Invalidate config cache
 * 
 * @param key - Optional specific key to invalidate
 * 
 * @description
 * Removes entries from cache to force fresh DB lookup.
 * Called automatically after config updates.
 * Can be called manually to force refresh.
 */
export function invalidateConfigCache(key?: string): void {
  if (key) {
    configCache.delete(key)
  } else {
    configCache.clear()
  }
}

/**
 * Get config change history
 * 
 * @param key - Configuration key
 * @param limit - Max number of history entries
 * @returns Array of historical changes
 * @throws Redirects if not admin
 * 
 * @description
 * Fetches version history for a config key.
 * Used by admin UI to show change history and enable rollback.
 */
export async function getConfigHistory(
  key: string,
  limit: number = 10
): Promise<Array<{
  version: number
  oldValue: any
  newValue: any
  changedBy: string | null
  changedAt: string
}>> {
  await requireAdmin()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('app_config_history')
    .select('version, old_value, new_value, changed_by, changed_at')
    .eq('key', key)
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching config history:', error)
    return []
  }

  return (data || []).map(entry => ({
    version: entry.version,
    oldValue: entry.old_value,
    newValue: entry.new_value,
    changedBy: entry.changed_by,
    changedAt: entry.changed_at,
  }))
}

/**
 * Rollback config to previous version
 * 
 * @param key - Configuration key
 * @param version - Version to rollback to
 * @returns Success status
 * @throws Redirects if not config admin
 * 
 * @description
 * Restores config to a previous version from history.
 * Creates new history entry for the rollback.
 */
export async function rollbackConfig(
  key: string,
  version: number
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin('config_admin')

  const supabase = await createClient()
  
  // Get the historical value
  const { data: history } = await supabase
    .from('app_config_history')
    .select('old_value')
    .eq('key', key)
    .eq('version', version)
    .single()

  if (!history) {
    return { success: false, error: 'Version not found' }
  }

  // Update to old value (this will create new history entry)
  return updateConfig(key, history.old_value)
}

/**
 * Get cache statistics
 * 
 * @returns Cache stats
 * 
 * @description
 * Returns current cache size and entry count.
 * Used for monitoring and debugging.
 */
export function getCacheStats(): {
  size: number
  entries: Array<{ key: string; expiresIn: number }>
} {
  const now = Date.now()
  const entries = Array.from(configCache.entries()).map(([key, entry]) => ({
    key,
    expiresIn: Math.max(0, entry.expiresAt - now),
  }))

  return {
    size: configCache.size,
    entries,
  }
}
