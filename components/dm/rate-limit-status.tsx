/**
 * Rate Limit Status Display
 * 
 * Shows remaining AI generation quota in the UI.
 * Also triggers database warmup on mount.
 * 
 * @example
 * ```tsx
 * // Add to DM navigation or header
 * <RateLimitStatus />
 * ```
 */

'use client'

import { useDatabaseWarmup } from '@/hooks/use-database-warmup'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'

export function RateLimitStatus() {
  const { isWarm, rateLimits, error } = useDatabaseWarmup()

  // Don't show anything if still loading
  if (!isWarm && !error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-600">
        <AlertCircle className="h-3 w-3" />
        <span>Rate limit unavailable</span>
      </div>
    )
  }

  // Show rate limits
  if (rateLimits) {
    const { campaign, town, shop } = rateLimits
    
    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-purple-500" />
          <span>
            Campaigns: <strong className={campaign.remaining < 3 ? 'text-red-500' : 'text-green-600'}>
              {campaign.remaining}
            </strong>/{campaign.max}
          </span>
        </div>
        
        <div className="hidden sm:block">
          Towns: <strong>{town.remaining}</strong>/{town.max}
        </div>
        
        <div className="hidden sm:block">
          Shops: <strong>{shop.remaining}</strong>/{shop.max}
        </div>
      </div>
    )
  }

  return null
}
