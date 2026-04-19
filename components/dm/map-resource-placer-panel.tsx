'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Gem, Loader2 } from 'lucide-react'

export interface AddedResourcePoint {
  id: string
  x_pct: number
  y_pct: number
  resource_type: string
  richness: number
  influence_radius_pct: number
  name: string | null
}

interface MapResourcePlacerPanelProps {
  campaignId: string
  mapId: string
  clickPos: { xPct: number; yPct: number } | null
  onClose: () => void
  onPlaced: (rp: AddedResourcePoint) => void
}

const RESOURCE_GROUPS: Array<{
  label: string
  items: Array<{ value: string; label: string; color: string; emoji: string }>
}> = [
  {
    label: 'Minerals',
    items: [
      { value: 'iron_deposit',   label: 'Iron',     color: '#78909c', emoji: '⛏' },
      { value: 'copper_deposit', label: 'Copper',   color: '#b87333', emoji: '⛏' },
      { value: 'gold_vein',      label: 'Gold',     color: '#ffd700', emoji: '💰' },
      { value: 'silver_vein',    label: 'Silver',   color: '#c0c0c0', emoji: '💿' },
      { value: 'gem_cluster',    label: 'Gems',     color: '#ce93d8', emoji: '💎' },
      { value: 'coal_seam',      label: 'Coal',     color: '#546e7a', emoji: '🪨' },
      { value: 'stone_quarry',   label: 'Stone',    color: '#a1887f', emoji: '🪨' },
      { value: 'salt_flat',      label: 'Salt',     color: '#eceff1', emoji: '🧂' },
      { value: 'sulfur_vent',    label: 'Sulfur',   color: '#fff176', emoji: '💨' },
    ],
  },
  {
    label: 'Food & Flora',
    items: [
      { value: 'fertile_farmland',  label: 'Farmland',  color: '#4caf50', emoji: '🌾' },
      { value: 'grazing_land',      label: 'Grazing',   color: '#8bc34a', emoji: '🐄' },
      { value: 'orchard',           label: 'Orchard',   color: '#ff9800', emoji: '🍎' },
      { value: 'ancient_forest',    label: 'Old Forest', color: '#1b5e20', emoji: '🌲' },
      { value: 'managed_woodland',  label: 'Woodland',  color: '#388e3c', emoji: '🪵' },
      { value: 'rare_herbs',        label: 'Herbs',     color: '#ab47bc', emoji: '🌿' },
    ],
  },
  {
    label: 'Water & Trade',
    items: [
      { value: 'deep_fishery',      label: 'Deep Fish',  color: '#1565c0', emoji: '🎣' },
      { value: 'coastal_fishery',   label: 'Coastal Fish', color: '#42a5f5', emoji: '🎣' },
      { value: 'river_fishery',     label: 'River Fish', color: '#4fc3f7', emoji: '🎣' },
      { value: 'natural_harbor',    label: 'Harbor',     color: '#0288d1', emoji: '⚓' },
      { value: 'river_ford',        label: 'Ford',       color: '#29b6f6', emoji: '🌊' },
      { value: 'trade_crossroads',  label: 'Crossroads', color: '#ff7043', emoji: '🗺' },
    ],
  },
  {
    label: 'Special',
    items: [
      { value: 'mountain_pass',   label: 'Pass',        color: '#78909c', emoji: '🏔' },
      { value: 'oasis',           label: 'Oasis',       color: '#00bcd4', emoji: '🌴' },
      { value: 'river_confluence', label: 'Confluence', color: '#0097a7', emoji: '🔀' },
      { value: 'arcane_nexus',    label: 'Arcane',      color: '#e040fb', emoji: '✨' },
      { value: 'ancient_ruins',   label: 'Ruins',       color: '#8d6e63', emoji: '🏛' },
      { value: 'volcanic_soil',   label: 'Volcanic',    color: '#ef5350', emoji: '🌋' },
      { value: 'hot_springs',     label: 'Springs',     color: '#ff8a65', emoji: '♨️' },
    ],
  },
]

export function MapResourcePlacerPanel({
  campaignId, mapId, clickPos, onClose, onPlaced,
}: MapResourcePlacerPanelProps) {
  const [selectedType, setSelectedType] = useState('iron_deposit')
  const [richness, setRichness] = useState(5)
  const [radiusPct, setRadiusPct] = useState(0.15)
  const [resourceName, setResourceName] = useState('')
  const [placing, setPlacing] = useState(false)
  const [lastPlaced, setLastPlaced] = useState<{ x: number; y: number; label: string } | null>(null)
  const prevClickPos = useRef<typeof clickPos>(null)

  useEffect(() => {
    if (!clickPos) return
    if (prevClickPos.current?.xPct === clickPos.xPct && prevClickPos.current?.yPct === clickPos.yPct) return
    prevClickPos.current = clickPos
    handlePlaceAt(clickPos.xPct, clickPos.yPct)
  }, [clickPos])

  async function handlePlaceAt(xPct: number, yPct: number) {
    setPlacing(true)

    const res = await fetch('/api/world/add-resource-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
        campaign_id: campaignId,
        x_pct: xPct,
        y_pct: yPct,
        resource_type: selectedType,
        richness,
        influence_radius_pct: radiusPct,
        name: resourceName.trim() || null,
      }),
    })

    const json = await res.json()
    setPlacing(false)

    if (!res.ok || json.error) return

    const placed: AddedResourcePoint = {
      ...json.data,
      influence_radius_pct: json.data.influence_radius_pct ?? radiusPct,
    }
    onPlaced(placed)
    const def = RESOURCE_GROUPS.flatMap(g => g.items).find(i => i.value === selectedType)
    setLastPlaced({ x: Math.round(xPct * 1000) / 10, y: Math.round(yPct * 1000) / 10, label: def?.label ?? selectedType })
  }

  const allItems = RESOURCE_GROUPS.flatMap(g => g.items)
  const selectedDef = allItems.find(i => i.value === selectedType)

  return (
    <div className="absolute inset-y-0 right-0 w-80 flex flex-col z-40 font-manrope" style={{
      background: 'rgba(14,16,19,0.97)',
      borderLeft: '1px solid rgba(255,198,55,0.1)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#282a2d]">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-on-surface">Resource Placer</h2>
          {placing && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-lg bg-[#1e2023] px-3 py-2 text-xs text-on-surface-variant text-center">
          {lastPlaced
            ? <span className="text-[#a5d6a7]">✓ Placed {lastPlaced.label} at ({lastPlaced.x}%, {lastPlaced.y}%)</span>
            : 'Click on the map to place a resource point'}
        </div>

        {selectedDef && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${selectedDef.color}22`, border: `1px solid ${selectedDef.color}44` }}>
            <span className="text-xl">{selectedDef.emoji}</span>
            <div>
              <div className="text-xs font-semibold text-on-surface">{selectedDef.label}</div>
              <div className="text-[10px] text-on-surface-variant">richness {richness}/10 · radius {Math.round(radiusPct * 100)}%</div>
            </div>
          </div>
        )}

        {RESOURCE_GROUPS.map(group => (
          <div key={group.label} className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{group.label}</div>
            <div className="grid grid-cols-3 gap-1">
              {group.items.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedType(item.value)}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-[9px] transition-all leading-tight ${
                    selectedType === item.value ? 'ring-1 ring-white/30' : 'hover:bg-[#282a2d]'
                  }`}
                  style={{
                    background: selectedType === item.value ? `${item.color}33` : undefined,
                    border: `1px solid ${item.color}${selectedType === item.value ? '66' : '22'}`,
                  }}
                >
                  <span className="text-base leading-none">{item.emoji}</span>
                  <span className="text-on-surface-variant text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-[#282a2d] pt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant flex justify-between">
              <span>Richness</span>
              <span className="text-on-surface">{richness}/10</span>
            </label>
            <input
              type="range" min={1} max={10} value={richness}
              onChange={e => setRichness(parseInt(e.target.value, 10))}
              className="w-full accent-[#ffc637]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant flex justify-between">
              <span>Influence radius</span>
              <span className="text-on-surface">{Math.round(radiusPct * 100)}%</span>
            </label>
            <input
              type="range" min={5} max={40} value={Math.round(radiusPct * 100)}
              onChange={e => setRadiusPct(parseInt(e.target.value, 10) / 100)}
              className="w-full accent-[#ffc637]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant">Name (optional)</label>
            <input
              value={resourceName}
              onChange={e => setResourceName(e.target.value)}
              placeholder="The Vein of Ashweld..."
              className="w-full bg-[#1e2023] rounded px-2 py-1.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#282a2d]">
        <button
          type="button"
          onClick={onClose}
          className="w-full px-3 py-2.5 rounded-lg text-xs text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d] transition-colors"
        >
          Done placing
        </button>
      </div>
    </div>
  )
}
