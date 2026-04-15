/**
 * AI Usage Counter
 * 
 * @fileoverview
 * Displays total AI token usage and estimated cost for the current user.
 * Fetches aggregated usage data from ai_usage table.
 * 
 * @features
 * - Real-time token count
 * - Cost estimation
 * - Loading states
 * - User-specific data
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'

export function AIUsageCounter() {
  const [totalTokens, setTotalTokens] = useState<number>(0)
  const [totalCost, setTotalCost] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('ai_usage')
        .select('tokens_used, estimated_cost')
        .eq('dm_id', user.id)

      if (data) {
        const tokens = data.reduce((sum, record) => sum + record.tokens_used, 0)
        const cost = data.reduce((sum, record) => sum + Number(record.estimated_cost), 0)
        setTotalTokens(tokens)
        setTotalCost(cost)
      }
      
      setLoading(false)
    }

    fetchUsage()
  }, [])

  if (loading || totalTokens === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
      <Sparkles className="w-3 h-3 text-gold" />
      <span>
        AI: {totalTokens.toLocaleString()} tokens | ${totalCost.toFixed(4)}
      </span>
    </div>
  )
}
