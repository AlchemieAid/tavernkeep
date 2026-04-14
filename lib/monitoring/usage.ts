/**
 * Usage monitoring and logging
 * Track API usage for rate limit management and cost analysis
 */

import { createClient } from '@/lib/supabase/server'

interface UsageMetadata {
  tokens?: number
  model?: string
  duration_ms?: number
  cost?: number
  [key: string]: any
}

/**
 * Log API usage for monitoring
 * @param service Service name (e.g., 'openai', 'supabase')
 * @param operation Operation name (e.g., 'generate-campaign', 'query')
 * @param metadata Additional metadata
 */
export async function logUsage(
  service: 'openai' | 'supabase' | 'vercel' | 'other',
  operation: string,
  metadata?: UsageMetadata
): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('usage_logs').insert({
      service,
      operation,
      dm_id: user?.id || null,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Don't fail if logging fails
    console.warn('[Usage] Failed to log usage:', error)
  }
}

/**
 * Get usage statistics for a service
 * @param service Service to get stats for
 * @param hoursAgo How many hours back to look
 * @returns Usage statistics
 */
export async function getUsageStats(
  service?: string,
  hoursAgo = 24
): Promise<{
  totalRequests: number
  uniqueUsers: number
  totalTokens: number
  totalCost: number
}> {
  try {
    const supabase = await createClient()
    const cutoffTime = new Date(Date.now() - hoursAgo * 3600000).toISOString()

    let query = supabase
      .from('usage_logs')
      .select('dm_id, metadata')
      .gte('timestamp', cutoffTime)

    if (service) {
      query = query.eq('service', service)
    }

    const { data, error } = await query

    if (error) throw error

    const uniqueUsers = new Set(data?.map(log => log.dm_id).filter(Boolean)).size
    const totalRequests = data?.length || 0
    const totalTokens = data?.reduce((sum, log) => {
      const tokens = (log.metadata as any)?.tokens || 0
      return sum + tokens
    }, 0) || 0
    const totalCost = data?.reduce((sum, log) => {
      const cost = (log.metadata as any)?.cost || 0
      return sum + cost
    }, 0) || 0

    return {
      totalRequests,
      uniqueUsers,
      totalTokens,
      totalCost,
    }
  } catch (error) {
    console.error('[Usage] Failed to get usage stats:', error)
    return {
      totalRequests: 0,
      uniqueUsers: 0,
      totalTokens: 0,
      totalCost: 0,
    }
  }
}

/**
 * Get recent usage for the current user
 * @param limit Number of recent logs to return
 * @returns Recent usage logs
 */
export async function getRecentUsage(limit = 10) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('dm_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[Usage] Failed to get recent usage:', error)
    return []
  }
}

/**
 * Calculate estimated cost for OpenAI usage
 * Based on current pricing (as of 2024)
 */
export function calculateOpenAICost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
    'gpt-4-turbo': { input: 10.00 / 1_000_000, output: 30.00 / 1_000_000 },
    'gpt-4': { input: 30.00 / 1_000_000, output: 60.00 / 1_000_000 },
    'gpt-3.5-turbo': { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 },
  }

  const modelPricing = pricing[model] || pricing['gpt-4o-mini']
  return inputTokens * modelPricing.input + outputTokens * modelPricing.output
}

/**
 * Wrapper to log OpenAI usage automatically
 */
export async function logOpenAIUsage(
  operation: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  durationMs?: number
): Promise<void> {
  const cost = calculateOpenAICost(model, inputTokens, outputTokens)
  
  await logUsage('openai', operation, {
    model,
    tokens: inputTokens + outputTokens,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost,
    duration_ms: durationMs,
  })
}
