import { createClient } from '@/lib/supabase/server'

interface CacheResult {
  found: boolean
  data?: any
  cacheId?: string
  tokensUsed?: number
  averageRating?: number
}

/**
 * Normalize prompt for similarity matching
 */
function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
}

/**
 * Calculate simple similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' '))
  const words2 = new Set(str2.split(' '))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  // Jaccard similarity
  return intersection.size / union.size
}

/**
 * Check cache for similar prompts with high ratings
 */
export async function checkCache(
  prompt: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  minRating: number = 4.0,
  minSimilarity: number = 0.7
): Promise<CacheResult> {
  const supabase = await createClient()
  const normalized = normalizePrompt(prompt)

  // Get cached generations of the same type with good ratings
  const { data: cached } = await supabase
    .from('generation_cache')
    .select('*')
    .eq('generation_type', generationType)
    .gte('average_rating', minRating)
    .order('average_rating', { ascending: false })
    .limit(20)

  if (!cached || cached.length === 0) {
    return { found: false }
  }

  // Find the most similar cached prompt
  let bestMatch: typeof cached[0] | null = null
  let bestSimilarity = 0

  for (const cache of cached) {
    const similarity = calculateSimilarity(normalized, cache.prompt_normalized)
    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity
      bestMatch = cache
    }
  }

  if (!bestMatch) {
    return { found: false }
  }

  // Update reuse stats
  await supabase
    .from('generation_cache')
    .update({
      times_reused: bestMatch.times_reused + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', bestMatch.id)

  return {
    found: true,
    data: bestMatch.output_data,
    cacheId: bestMatch.id,
    tokensUsed: bestMatch.tokens_used,
    averageRating: bestMatch.average_rating || undefined
  }
}

/**
 * Store generation in cache
 */
export async function storeInCache(
  prompt: string,
  generationType: 'campaign' | 'town' | 'shop' | 'item',
  outputData: any,
  tokensUsed: number,
  model: string
): Promise<string | null> {
  const supabase = await createClient()
  const normalized = normalizePrompt(prompt)

  const { data, error } = await supabase
    .from('generation_cache')
    .insert({
      generation_type: generationType,
      prompt_normalized: normalized,
      prompt_original: prompt,
      output_data: outputData,
      tokens_used: tokensUsed,
      model
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to cache generation:', error)
    return null
  }

  return data?.id || null
}

/**
 * Submit a rating for a cached generation
 */
export async function rateGeneration(
  cacheId: string,
  userId: string,
  rating: number,
  feedback?: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('generation_ratings')
    .upsert({
      cache_id: cacheId,
      dm_id: userId,
      rating,
      feedback: feedback || null
    })

  if (error) {
    console.error('Failed to rate generation:', error)
    return false
  }

  return true
}
