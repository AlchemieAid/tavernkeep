/**
 * Navigation Dropdowns
 * 
 * @fileoverview
 * Desktop navigation with hierarchical dropdowns for campaigns, towns, shops, and NPCs.
 * Fetches user's entities and displays them in organized dropdown menus.
 * 
 * @features
 * - Hierarchical dropdown navigation
 * - Context-aware active states
 * - Real-time entity fetching
 * - Desktop-optimized layout
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { Campaign, Town, Shop, NotablePerson } from '@/types/database'

export function NavigationDropdowns() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [towns, setTowns] = useState<Town[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [notablePeople, setNotablePeople] = useState<NotablePerson[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedTown, setSelectedTown] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true)
  
  // Use ref for loadData to avoid stale closures in realtime subscription
  const loadDataRef = useRef<() => Promise<void>>()

  // Main data loading function
  const loadData = useCallback(async () => {
    if (!isMounted.current) return
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      if (isMounted.current) setLoading(false)
      return
    }
    
    if (isMounted.current) setUserId(user.id)

    // Load campaigns
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('dm_id', user.id)
      .order('created_at', { ascending: false })

    if (!isMounted.current) return

    if (campaignsData) {
      setCampaigns(campaignsData)
      
      // Detect campaign from URL
      let campaignId: string | null = null
      
      // Check if we're on a campaign page
      const campaignMatch = pathname.match(/\/campaigns\/([^\/]+)/)
      if (campaignMatch) {
        campaignId = campaignMatch[1]
      }
      
      // Check if we're on a town page - fetch the campaign_id and set selected town
      const townMatch = pathname.match(/\/towns\/([^\/]+)/)
      if (townMatch && !campaignId) {
        const townId = townMatch[1]
        setSelectedTown(townId)
        
        const { data: townData } = await supabase
          .from('towns')
          .select('campaign_id')
          .eq('id', townId)
          .single()
        if (townData) {
          campaignId = townData.campaign_id
        }
      } else if (!townMatch) {
        setSelectedTown(null)
      }
      
      // Check if we're on a shop page - fetch the campaign_id
      const shopMatch = pathname.match(/\/shops\/([^\/]+)/)
      if (shopMatch && !campaignId) {
        const { data: shopData } = await supabase
          .from('shops')
          .select('campaign_id')
          .eq('id', shopMatch[1])
          .single()
        if (shopData) {
          campaignId = shopData.campaign_id
        }
      }
      
      // Check if the detected/selected campaign still exists in the list
      const campaignExists = campaignId && campaignsData.some(c => c.id === campaignId)
      
      // Fallback to first campaign if selected one was deleted
      const initialCampaign = campaignExists ? campaignId : campaignsData[0]?.id
      
      if (initialCampaign) {
        setSelectedCampaign(initialCampaign)
        await loadCampaignData(initialCampaign, townMatch ? townMatch[1] : null)
      } else {
        // No campaigns left - clear everything
        setSelectedCampaign(null)
        setTowns([])
        setShops([])
        setNotablePeople([])
      }
    }

    if (isMounted.current) setLoading(false)
  }, [pathname])
  
  // Keep ref updated with latest loadData
  useEffect(() => {
    loadDataRef.current = loadData
  }, [loadData])

  // Initial data load
  useEffect(() => {
    isMounted.current = true
    loadData()
    
    return () => {
      isMounted.current = false
    }
  }, [loadData])

  // Realtime subscription with proper user filtering
  useEffect(() => {
    if (!userId) return
    
    const supabase = createClient()
    
    // Subscribe to campaign changes for this user only
    const channel = supabase
      .channel(`navigation-campaigns-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `dm_id=eq.${userId}`
        },
        (payload) => {
          console.log('[Navigation] Campaign change detected:', payload.eventType, payload.new)
          // Use ref to call latest loadData
          loadDataRef.current?.()
        }
      )
      .subscribe((status) => {
        console.log('[Navigation] Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Reload data when page becomes visible (handles deletion from other tabs/pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Navigation] Page became visible, reloading data')
        loadDataRef.current?.()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Reload data when t query param changes (from deleteCampaign redirect)
  useEffect(() => {
    const timestamp = searchParams.get('t')
    if (timestamp) {
      console.log('[Navigation] Timestamp param detected, reloading data')
      loadDataRef.current?.()
    }
  }, [searchParams])

  async function loadCampaignData(campaignId: string, townId: string | null = null) {
    const supabase = createClient()

    // Load towns for this campaign
    const { data: townsData } = await supabase
      .from('towns')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (townsData) {
      setTowns(townsData)
    }

    // Load shops - filter by town if on a town page, otherwise show all for campaign
    let shopsQuery = supabase
      .from('shops')
      .select('*')
      .eq('campaign_id', campaignId)
    
    if (townId) {
      shopsQuery = shopsQuery.eq('town_id', townId)
    }
    
    const { data: shopsData } = await shopsQuery.order('created_at', { ascending: false })

    if (shopsData) {
      setShops(shopsData)
    }

    // Load notable people - filter by town if on a town page, otherwise show all for campaign
    if (townId) {
      // If on a town page, only show people from that town
      const { data: notablePeopleData } = await supabase
        .from('notable_people')
        .select('*')
        .eq('town_id', townId)
        .order('created_at', { ascending: false })

      if (notablePeopleData) {
        setNotablePeople(notablePeopleData)
      } else {
        setNotablePeople([])
      }
    } else {
      // If on campaign page, show all people from all towns in campaign
      const { data: rawCampaignTowns } = await supabase
        .from('towns')
        .select('id')
        .eq('campaign_id', campaignId)
      const campaignTowns = rawCampaignTowns as { id: string }[] | null
      if (campaignTowns && campaignTowns.length > 0) {
        const townIds = campaignTowns.map(t => t.id)
        
        const { data: notablePeopleData } = await supabase
          .from('notable_people')
          .select('*')
          .in('town_id', townIds)
          .order('created_at', { ascending: false })

        if (notablePeopleData) {
          setNotablePeople(notablePeopleData)
        }
      } else {
        setNotablePeople([])
      }
    }
  }

  const handleCampaignChange = async (campaignId: string) => {
    setSelectedCampaign(campaignId)
    setSelectedTown(null)
    await loadCampaignData(campaignId, null)
    router.push(`/dm/campaigns/${campaignId}`)
  }

  const handleTownChange = async (townId: string) => {
    setSelectedTown(townId)
    if (selectedCampaign) {
      await loadCampaignData(selectedCampaign, townId)
    }
    router.push(`/dm/towns/${townId}`)
  }

  const handleShopChange = (shopId: string) => {
    router.push(`/dm/shops/${shopId}`)
  }

  const handleNotablePersonChange = (personId: string) => {
    router.push(`/dm/notable-people/${personId}/edit`)
  }

  if (loading) {
    return null
  }

  // Always show at least the Item Library link
  if (campaigns.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dm/items"
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-surface-container transition-colors"
        >
          Item Library
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Campaigns Dropdown */}
      <div className="relative group">
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-surface-container transition-colors">
          <span className="font-medium">
            {campaigns.find(c => c.id === selectedCampaign)?.name || 'Campaigns'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>
        
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container border border-outline rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="py-1 max-h-80 overflow-y-auto">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => handleCampaignChange(campaign.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors ${
                  selectedCampaign === campaign.id ? 'bg-surface font-medium' : ''
                }`}
              >
                {campaign.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Towns Dropdown */}
      {selectedCampaign && towns.length > 0 && (
        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-surface-container transition-colors">
            <span>Towns</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container border border-outline rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="py-1 max-h-80 overflow-y-auto">
              {towns.map((town) => (
                <button
                  key={town.id}
                  onClick={() => handleTownChange(town.id)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors"
                >
                  {town.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notable People Dropdown */}
      {selectedCampaign && notablePeople.length > 0 && (
        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-surface-container transition-colors">
            <span>People</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container border border-outline rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="py-1 max-h-80 overflow-y-auto">
              {notablePeople.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleNotablePersonChange(person.id)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors"
                >
                  {person.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shops Dropdown */}
      {selectedCampaign && shops.length > 0 && (
        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-surface-container transition-colors">
            <span>Shops</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container border border-outline rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="py-1 max-h-80 overflow-y-auto">
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => handleShopChange(shop.id)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors"
                >
                  {shop.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <Link
        href="/dm/items"
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md hover:bg-surface-container transition-colors"
      >
        Item Library
      </Link>
    </div>
  )
}
