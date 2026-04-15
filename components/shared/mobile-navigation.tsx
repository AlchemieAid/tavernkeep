/**
 * Mobile Navigation
 * 
 * @fileoverview
 * Mobile-responsive slide-out navigation menu with hierarchical campaign/town/shop/NPC navigation.
 * Uses Sheet component for slide-out drawer.
 * 
 * @features
 * - Hierarchical navigation (campaigns → towns → shops/NPCs)
 * - Mobile-optimized drawer
 * - Context-aware active states
 * - Icon-based navigation
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, ChevronRight, Home, Scroll, Users, Store, Package } from 'lucide-react'
import Link from 'next/link'
import type { Campaign, Town, Shop, NotablePerson } from '@/types/database'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function MobileNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [towns, setTowns] = useState<Town[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [notablePeople, setNotablePeople] = useState<NotablePerson[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedTown, setSelectedTown] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data: rawCampaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('dm_id', user.id)
        .order('created_at', { ascending: false })
      const campaignsData = rawCampaignsData as Campaign[] | null

      if (campaignsData) {
        setCampaigns(campaignsData)
        
        let campaignId: string | null = null
        
        const campaignMatch = pathname.match(/\/campaigns\/([^\/]+)/)
        if (campaignMatch) {
          campaignId = campaignMatch[1]
        }
        
        const townMatch = pathname.match(/\/towns\/([^\/]+)/)
        if (townMatch && !campaignId) {
          const townId = townMatch[1]
          setSelectedTown(townId)
          
          const { data: rawTownData } = await supabase
            .from('towns')
            .select('campaign_id')
            .eq('id', townId)
            .single()
          const townData = rawTownData as { campaign_id: string } | null
          if (townData) {
            campaignId = townData.campaign_id
          }
        } else if (!townMatch) {
          setSelectedTown(null)
        }
        
        const shopMatch = pathname.match(/\/shops\/([^\/]+)/)
        if (shopMatch && !campaignId) {
          const { data: rawShopData } = await supabase
            .from('shops')
            .select('campaign_id')
            .eq('id', shopMatch[1])
            .single()
          const shopData = rawShopData as { campaign_id: string } | null
          if (shopData) {
            campaignId = shopData.campaign_id
          }
        }
        
        const initialCampaign = campaignId || campaignsData[0]?.id
        
        if (initialCampaign) {
          setSelectedCampaign(initialCampaign)
          await loadCampaignData(initialCampaign, townMatch ? townMatch[1] : null)
        }
      }

      setLoading(false)
    }

    loadData()

    const channel = supabase
      .channel('mobile-navigation-campaigns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns'
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pathname])

  async function loadCampaignData(campaignId: string, townId: string | null = null) {
    const supabase = createClient()

    const { data: townsData } = await supabase
      .from('towns')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (townsData) {
      setTowns(townsData)
    }

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

    if (townId) {
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
    setOpen(false)
  }

  const handleTownChange = async (townId: string) => {
    setSelectedTown(townId)
    if (selectedCampaign) {
      await loadCampaignData(selectedCampaign, townId)
    }
    router.push(`/dm/towns/${townId}`)
    setOpen(false)
  }

  const handleShopChange = (shopId: string) => {
    router.push(`/dm/shops/${shopId}`)
    setOpen(false)
  }

  const handleNotablePersonChange = (personId: string) => {
    router.push(`/dm/notable-people/${personId}/edit`)
    setOpen(false)
  }

  const handleItemLibraryClick = () => {
    router.push('/dm/items')
    setOpen(false)
  }

  if (loading) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button 
          className="p-2 hover:bg-surface-container rounded-md transition-colors lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-gold">Navigation</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Dashboard Link */}
          <Link
            href="/dm/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-container transition-colors"
          >
            <Home className="w-5 h-5 text-gold" />
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Campaigns Section */}
          {campaigns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 text-sm font-medium text-on-surface-variant">
                <Scroll className="w-4 h-4" />
                <span>Campaigns</span>
              </div>
              <div className="space-y-1">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => handleCampaignChange(campaign.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCampaign === campaign.id 
                        ? 'bg-surface-container font-medium' 
                        : 'hover:bg-surface-container'
                    }`}
                  >
                    <span className="truncate">{campaign.name}</span>
                    {selectedCampaign === campaign.id && (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Towns Section */}
          {selectedCampaign && towns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 text-sm font-medium text-on-surface-variant">
                <Home className="w-4 h-4" />
                <span>Towns</span>
              </div>
              <div className="space-y-1">
                {towns.map((town) => (
                  <button
                    key={town.id}
                    onClick={() => handleTownChange(town.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-surface-container transition-colors"
                  >
                    <span className="truncate">{town.name}</span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notable People Section */}
          {selectedCampaign && notablePeople.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 text-sm font-medium text-on-surface-variant">
                <Users className="w-4 h-4" />
                <span>Notable People</span>
              </div>
              <div className="space-y-1">
                {notablePeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleNotablePersonChange(person.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-surface-container transition-colors"
                  >
                    <span className="truncate">{person.name}</span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shops Section */}
          {selectedCampaign && shops.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 text-sm font-medium text-on-surface-variant">
                <Store className="w-4 h-4" />
                <span>Shops</span>
              </div>
              <div className="space-y-1">
                {shops.map((shop) => (
                  <button
                    key={shop.id}
                    onClick={() => handleShopChange(shop.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-surface-container transition-colors"
                  >
                    <span className="truncate">{shop.name}</span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item Library */}
          <button
            onClick={handleItemLibraryClick}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-container transition-colors"
          >
            <Package className="w-5 h-5 text-gold" />
            <span className="font-medium">Item Library</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
