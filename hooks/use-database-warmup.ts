/**
 * Database Warmup Hook
 * 
 * Keeps Supabase connection warm while user is on DM pages.
 * Pings /api/health every 2 minutes to prevent cold starts.
 * Also fetches rate limit status on mount for better UX.
 * 
 * @example
 * ```tsx
 * // In DM layout or pages
 * export default function DMPage() {
 *   const { isWarm, rateLimits, error } = useDatabaseWarmup()
 *   
 *   return (
 *     <div>
 *       {rateLimits && (
 *         <Badge>{rateLimits.campaign.remaining} campaigns left</Badge>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface RateLimitStatus {
  campaign: { remaining: number; max: number; allowed: boolean }
  town: { remaining: number; max: number; allowed: boolean }
  shop: { remaining: number; max: number; allowed: boolean }
  userId: string
  dbTime: number
  timestamp: string
}

interface WarmupState {
  isWarm: boolean
  rateLimits: RateLimitStatus | null
  lastPingTime: number | null
  error: string | null
}

const HEALTH_CHECK_INTERVAL = 2 * 60 * 1000 // 2 minutes
const INITIAL_DELAY = 5 * 1000 // 5 seconds after mount

export function useDatabaseWarmup() {
  const [state, setState] = useState<WarmupState>({
    isWarm: false,
    rateLimits: null,
    lastPingTime: null,
    error: null
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Fetch rate limit status on mount
   * This also warms up the database connection
   */
  const fetchRateLimits = useCallback(async () => {
    try {
      const response = await fetch('/api/rate-limit/status')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data: RateLimitStatus = await response.json()
      
      setState(prev => ({
        ...prev,
        rateLimits: data,
        isWarm: true,
        error: null
      }))
      
      console.log('[WARMUP] Rate limits fetched, database warm:', data)
      
    } catch (error) {
      console.error('[WARMUP] Failed to fetch rate limits:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [])

  /**
   * Lightweight health ping to keep connection warm
   */
  const pingHealth = useCallback(async () => {
    try {
      const startTime = Date.now()
      const response = await fetch('/api/health', {
        method: 'GET',
        // Light cache-busting to prevent browser caching
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      const pingTime = Date.now() - startTime
      
      setState(prev => ({
        ...prev,
        isWarm: true,
        lastPingTime: Date.now(),
        error: null
      }))
      
      console.log(`[WARMUP] Health ping completed in ${pingTime}ms, dbTime: ${data.dbTime}ms`)
      
    } catch (error) {
      console.error('[WARMUP] Health ping failed:', error)
      setState(prev => ({
        ...prev,
        isWarm: false,
        error: error instanceof Error ? error.message : 'Health ping failed'
      }))
    }
  }, [])

  useEffect(() => {
    // Initial rate limit fetch (warms database + shows status)
    const initialTimeout = setTimeout(() => {
      fetchRateLimits()
    }, INITIAL_DELAY)
    
    // Start heartbeat to keep connection warm
    intervalRef.current = setInterval(() => {
      pingHealth()
    }, HEALTH_CHECK_INTERVAL)
    
    // Cleanup on unmount
    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchRateLimits, pingHealth])

  return state
}
