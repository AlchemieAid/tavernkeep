'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown } from 'lucide-react'
import type { Campaign, Town, Shop } from '@/types/database'

export function NavigationDropdowns() {
  const router = useRouter()
  const pathname = usePathname()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [towns, setTowns] = useState<Town[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Load campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('dm_id', user.id)
        .order('created_at', { ascending: false })

      if (campaignsData) {
        setCampaigns(campaignsData)
        
        // Detect campaign from URL
        let campaignId: string | null = null
        
        // Check if we're on a campaign page
        const campaignMatch = pathname.match(/\/campaigns\/([^\/]+)/)
        if (campaignMatch) {
          campaignId = campaignMatch[1]
        }
        
        // Check if we're on a town page - fetch the campaign_id
        const townMatch = pathname.match(/\/towns\/([^\/]+)/)
        if (townMatch && !campaignId) {
          const { data: townData } = await supabase
            .from('towns')
            .select('campaign_id')
            .eq('id', townMatch[1])
            .single()
          
          if (townData) {
            campaignId = townData.campaign_id
          }
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
        
        // Fallback to first campaign
        const initialCampaign = campaignId || campaignsData[0]?.id
        
        if (initialCampaign) {
          setSelectedCampaign(initialCampaign)
          await loadCampaignData(initialCampaign)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [pathname])

  async function loadCampaignData(campaignId: string) {
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

    // Load shops for this campaign
    const { data: shopsData } = await supabase
      .from('shops')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (shopsData) {
      setShops(shopsData)
    }
  }

  const handleCampaignChange = async (campaignId: string) => {
    setSelectedCampaign(campaignId)
    await loadCampaignData(campaignId)
    router.push(`/dm/campaigns/${campaignId}`)
  }

  const handleTownChange = (townId: string) => {
    router.push(`/dm/towns/${townId}`)
  }

  const handleShopChange = (shopId: string) => {
    router.push(`/dm/shops/${shopId}`)
  }

  if (loading || campaigns.length === 0) {
    return null
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
    </div>
  )
}
