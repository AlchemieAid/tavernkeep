'use client'

import { useState } from 'react'
import { X, Loader2, Check, Route } from 'lucide-react'

export interface PlacedTradeRouteResult {
  id: string
  map_id: string
  town_a_id: string
  town_b_id: string
  primary_goods: string[] | null
  trade_volume: number | null
}

interface MapTradeRoutePanelProps {
  campaignId: string
  mapId: string
  townA: { id: string; name: string | null; town_tier: string | null }
  townB: { id: string; name: string | null; town_tier: string | null }
  onClose: () => void
  onPlaced: (route: PlacedTradeRouteResult) => void
}

const COMMON_GOODS = [
  'Grain', 'Timber', 'Iron', 'Cloth', 'Spices', 'Salt',
  'Wine', 'Gems', 'Livestock', 'Pottery', 'Leather', 'Coal',
  'Fish', 'Herbs', 'Stone', 'Gold', 'Silver', 'Magic items',
]

export function MapTradeRoutePanel({ campaignId, mapId, townA, townB, onClose, onPlaced }: MapTradeRoutePanelProps) {
  const [selectedGoods, setSelectedGoods] = useState<string[]>([])
  const [customGood, setCustomGood] = useState('')
  const [tradeVolume, setTradeVolume] = useState(5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGood(good: string) {
    setSelectedGoods(prev =>
      prev.includes(good) ? prev.filter(g => g !== good) : [...prev, good]
    )
  }

  function addCustomGood() {
    const trimmed = customGood.trim()
    if (!trimmed || selectedGoods.includes(trimmed)) return
    setSelectedGoods(prev => [...prev, trimmed])
    setCustomGood('')
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const res = await fetch('/api/world/place-trade-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
        campaign_id: campaignId,
        town_a_id: townA.id,
        town_b_id: townB.id,
        primary_goods: selectedGoods,
        trade_volume: tradeVolume,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Failed to create trade route')
      setSaving(false)
      return
    }

    onPlaced(json.data as PlacedTradeRouteResult)
  }

  const VOLUME_LABELS = ['Negligible', 'Trickle', 'Light', 'Moderate', 'Active', 'Busy', 'Heavy', 'Major', 'Arterial', 'Dominant', 'Legendary']

  return (
    <div className="absolute inset-y-0 right-0 w-80 flex flex-col z-40 font-manrope" style={{
      background: 'rgba(14,16,19,0.97)',
      borderLeft: '1px solid rgba(255,198,55,0.1)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#282a2d]">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-on-surface">Trade Route</h2>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-lg bg-[#1e2023] px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffc637]" />
            <span className="text-xs text-on-surface">{townA.name ?? 'Unnamed'}</span>
            <span className="text-[10px] text-on-surface-variant capitalize ml-auto">{townA.town_tier ?? ''}</span>
          </div>
          <div className="border-l border-dashed border-[#ffc637]/30 ml-1 my-1 h-3" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffc637]" />
            <span className="text-xs text-on-surface">{townB.name ?? 'Unnamed'}</span>
            <span className="text-[10px] text-on-surface-variant capitalize ml-auto">{townB.town_tier ?? ''}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Trade volume · {VOLUME_LABELS[Math.min(tradeVolume, 10)]}
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={tradeVolume}
            onChange={e => setTradeVolume(parseInt(e.target.value, 10))}
            className="w-full accent-[#ffc637]"
          />
          <div className="flex justify-between text-[9px] text-on-surface-variant">
            <span>None</span>
            <span>Moderate</span>
            <span>Legendary</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Primary goods traded</label>
          <div className="flex gap-1 flex-wrap">
            {COMMON_GOODS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGood(g)}
                className={`px-2 py-1 rounded text-[10px] transition-all ${
                  selectedGoods.includes(g)
                    ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                    : 'bg-[#1e2023] text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={customGood}
              onChange={e => setCustomGood(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomGood()}
              placeholder="Custom good..."
              className="flex-1 bg-[#1e2023] rounded-lg px-2 py-1.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={addCustomGood}
              className="px-2 py-1.5 rounded-lg text-xs bg-[#282a2d] text-on-surface-variant hover:text-on-surface"
            >
              Add
            </button>
          </div>
          {selectedGoods.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {selectedGoods.map(g => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary/15 text-primary"
                >
                  {g}
                  <button type="button" onClick={() => toggleGood(g)} className="hover:text-primary/70">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-[#93000a]/20 px-3 py-2 text-xs text-[#ffb4ab]">{error}</div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-[#282a2d] flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-2.5 rounded-lg text-xs text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-[#3f2e00] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Create Route
        </button>
      </div>
    </div>
  )
}
