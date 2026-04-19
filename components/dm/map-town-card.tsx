'use client'

import Link from 'next/link'
import { X, ExternalLink, ShoppingBag, Castle, Plus } from 'lucide-react'
import { wealthLabel } from '@/lib/world/wealthField'

interface MapTownCardProps {
  town: {
    id: string
    name: string | null
    town_tier: string | null
    wealth_score: number | null
    specializations: string[] | null
    population_est?: number | null
    shop_id?: string | null
    poi_id?: string | null
  }
  campaignId: string
  x: number
  y: number
  containerWidth: number
  containerHeight: number
  onClose: () => void
}

const TIER_ICONS: Record<string, string> = {
  hamlet: '🏘', village: '🏡', town: '🏙', city: '🌆', metropolis: '🌇',
}

export function MapTownCard({
  town,
  campaignId,
  x,
  y,
  containerWidth,
  containerHeight,
  onClose,
}: MapTownCardProps) {
  const CARD_W = 280
  const CARD_H = 200
  const MARGIN = 12

  const flipLeft = x + CARD_W + MARGIN > containerWidth
  const flipUp   = y + CARD_H + MARGIN > containerHeight

  const cardX = flipLeft ? x - CARD_W - 12 : x + 16
  const cardY = flipUp   ? y - CARD_H - 12  : y + 16

  const tier = town.town_tier ?? 'hamlet'
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const wealth = town.wealth_score ?? 0
  const wLabel = wealthLabel(wealth)
  const icon = TIER_ICONS[tier] ?? '🏘'

  return (
    <div
      className="absolute z-50 pointer-events-auto font-manrope"
      style={{ left: cardX, top: cardY, width: CARD_W }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(14,16,19,0.97)',
          border: '1px solid rgba(255,198,55,0.15)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="text-sm font-noto-serif text-on-surface">{town.name ?? 'Unnamed Town'}</div>
              <div className="text-xs text-on-surface-variant">{tierLabel} · {wLabel}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 pb-3 space-y-3">
          {town.specializations && town.specializations.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {town.specializations.map(s => (
                <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-primary/15 text-primary">{s}</span>
              ))}
            </div>
          )}

          {town.population_est != null && (
            <div className="text-xs text-on-surface-variant">
              Est. population: <span className="text-on-surface">{town.population_est.toLocaleString()}</span>
            </div>
          )}

          <div className="border-t border-[#282a2d] pt-3 flex flex-col gap-1.5">
            {town.shop_id ? (
              <Link
                href={`/dm/shops/${town.shop_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#3f2e00] hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                View Linked Shop
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
            ) : (
              <Link
                href={`/dm/shops/new?campaign_id=${campaignId}&world_town_id=${town.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d] transition-all border border-[#282a2d]"
              >
                <Plus className="w-3.5 h-3.5" />
                Create a Shop here
              </Link>
            )}
            <Link
              href={`/dm/campaigns/${campaignId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d] transition-all"
            >
              <Castle className="w-3.5 h-3.5" />
              Campaign overview
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
