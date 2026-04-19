'use client'

import { useState } from 'react'
import { X, Loader2, Check, Castle } from 'lucide-react'
import type { IDWResult, ResourcePoint } from '@/lib/world/resourceInterpolation'
import { computeWealthScore, wealthLabel, estimatePopulation } from '@/lib/world/wealthField'
import { deriveTownProfile } from '@/lib/world/centralPlace'

export interface PlacedTownResult {
  id: string
  x_pct: number
  y_pct: number
  name: string | null
  town_tier: string | null
  wealth_score: number | null
  specializations: string[] | null
}

interface MapTownPanelProps {
  campaignId: string
  mapId: string
  xPct: number
  yPct: number
  idwResult: IDWResult
  resourcePoints: ResourcePoint[]
  onClose: () => void
  onPlaced: (town: PlacedTownResult) => void
}

const PRICE_LABELS: Partial<Record<string, { label: string; dir: 'cheaper' | 'expensive' | 'normal' }>> = {}

function getPriceImpact(scores: IDWResult['scores']): Array<{ name: string; dir: 'cheaper' | 'expensive' }> {
  const impacts: Array<{ name: string; dir: 'cheaper' | 'expensive' }> = []
  if (scores.mining > 0.55) impacts.push({ name: 'Weapons & armor', dir: 'cheaper' })
  if (scores.mining < 0.2) impacts.push({ name: 'Weapons & armor', dir: 'expensive' })
  if (scores.agriculture > 0.6) impacts.push({ name: 'Food & provisions', dir: 'cheaper' })
  if (scores.forestry > 0.55) impacts.push({ name: 'Wood & lumber', dir: 'cheaper' })
  if (scores.fishing > 0.55) impacts.push({ name: 'Fish & seafood', dir: 'cheaper' })
  if (scores.trade_access > 0.6) impacts.push({ name: 'Exotic goods', dir: 'cheaper' })
  if (scores.trade_access < 0.25) impacts.push({ name: 'Imported goods', dir: 'expensive' })
  if (scores.water_access > 0.7) impacts.push({ name: 'Maritime trade', dir: 'cheaper' })
  return impacts.slice(0, 4)
}

function getNearbyResources(xPct: number, yPct: number, resourcePoints: ResourcePoint[]): Array<{ name: string; type: string; dist_km: number }> {
  return resourcePoints
    .map(rp => {
      const dx = rp.x_pct - xPct
      const dy = rp.y_pct - yPct
      const distPct = Math.sqrt(dx * dx + dy * dy)
      const dist_km = Math.round(distPct * 500)
      return { name: rp.name ?? rp.resource_type.replace(/_/g, ' '), type: rp.resource_type, dist_km }
    })
    .sort((a, b) => a.dist_km - b.dist_km)
    .slice(0, 3)
}

const RESOURCE_ICONS: Record<string, string> = {
  iron_deposit: '⛏', copper_deposit: '⚙️', gold_vein: '✨', silver_vein: '⚪',
  gem_cluster: '💎', coal_seam: '🪨', stone_quarry: '🏔',
  deep_fishery: '🐟', coastal_fishery: '🎣', river_fishery: '🎣',
  fertile_farmland: '🌾', grazing_land: '🐄', orchard: '🍎',
  ancient_forest: '🌲', managed_woodland: '🌳', rare_herbs: '🌿',
  natural_harbor: '⚓', river_ford: '🏞', mountain_pass: '⛰',
  trade_crossroads: '🛣', oasis: '🏜', river_confluence: '💧',
  arcane_nexus: '✨', ancient_ruins: '🏛', volcanic_soil: '🌋', hot_springs: '♨️',
}

export function MapTownPanel({
  campaignId,
  mapId,
  xPct,
  yPct,
  idwResult,
  resourcePoints,
  onClose,
  onPlaced,
}: MapTownPanelProps) {
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wealthScore = computeWealthScore(idwResult.scores)
  const { tier, specializations } = deriveTownProfile(wealthScore, idwResult.scores)
  const population = estimatePopulation(wealthScore, tier)
  const priceImpacts = getPriceImpact(idwResult.scores)
  const nearbyResources = getNearbyResources(xPct, yPct, resourcePoints)

  async function handleFound() {
    setPlacing(true)
    setError(null)

    const res = await fetch('/api/world/place-town', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
        campaign_id: campaignId,
        x_pct: xPct,
        y_pct: yPct,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Failed to place town')
      setPlacing(false)
      return
    }

    onPlaced(json.data)
  }

  const tierCapitalized = tier.charAt(0).toUpperCase() + tier.slice(1)

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md mx-4 z-40 rounded-xl overflow-hidden font-manrope"
      style={{
        background: 'rgba(14,16,19,0.97)',
        border: '1px solid rgba(255,198,55,0.15)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-start justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <Castle className="w-5 h-5 text-primary" />
          <div>
            <div className="text-base font-noto-serif text-on-surface">
              A <span className="text-primary">{tierCapitalized}</span> would arise here
            </div>
            <div className="text-xs text-on-surface-variant mt-0.5">
              {wealthLabel(wealthScore)} region · ~{Math.round(idwResult.elevation_m)}m elevation
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {nearbyResources.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">Dominant resources nearby</div>
            <div className="space-y-1">
              {nearbyResources.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-on-surface">
                  <span>{RESOURCE_ICONS[r.type] ?? '📦'}</span>
                  <span className="flex-1 capitalize">{r.name}</span>
                  <span className="text-on-surface-variant">{r.dist_km}km</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {specializations.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">Economy</div>
            <div className="flex gap-1.5 flex-wrap">
              {specializations.map(s => (
                <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-primary/15 text-primary">{s}</span>
              ))}
            </div>
          </div>
        )}

        {priceImpacts.length > 0 && (
          <div className="space-y-1">
            {priceImpacts.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-on-surface">{p.name}</span>
                <span className={p.dir === 'cheaper' ? 'text-[#81c784]' : 'text-[#ef9a9a]'}>
                  {p.dir === 'cheaper' ? '↓ cheaper' : '↑ expensive'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-[#282a2d] pt-3 flex items-center justify-between text-xs">
          <span className="text-on-surface-variant">Est. population</span>
          <span className="text-on-surface font-semibold">
            {population.min.toLocaleString()}–{population.max.toLocaleString()}
          </span>
        </div>

        {error && (
          <div className="rounded-lg bg-[#93000a]/20 px-3 py-2 text-xs text-[#ffb4ab]">{error}</div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-xs text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFound}
            disabled={placing}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-[#3f2e00] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
          >
            {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Found This Town
          </button>
        </div>
      </div>
    </div>
  )
}
