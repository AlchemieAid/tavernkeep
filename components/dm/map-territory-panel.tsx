'use client'

import { useState } from 'react'
import { X, Loader2, Check, Shield } from 'lucide-react'

export interface PlacedTerritoryResult {
  id: string
  name: string
  faction: string | null
  color: string | null
  polygon: Array<{ x: number; y: number }>
  law_level: string | null
  attitude_to_strangers: string | null
  patrol_intensity: string | null
  notes: string | null
}

interface MapTerritoryPanelProps {
  campaignId: string
  mapId: string
  polygon: Array<{ x: number; y: number }>
  onClose: () => void
  onPlaced: (territory: PlacedTerritoryResult) => void
}

const PRESET_COLORS = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#eab308', label: 'Yellow' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Purple' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#14b8a6', label: 'Teal' },
]

const LAW_LEVELS = ['lawless', 'low', 'moderate', 'high', 'strict'] as const
const ATTITUDES = ['hostile', 'suspicious', 'neutral', 'friendly', 'welcoming'] as const
const PATROL_LEVELS = ['none', 'light', 'moderate', 'heavy', 'militarized'] as const

export function MapTerritoryPanel({ campaignId, mapId, polygon, onClose, onPlaced }: MapTerritoryPanelProps) {
  const [name, setName] = useState('')
  const [faction, setFaction] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [lawLevel, setLawLevel] = useState<string>('moderate')
  const [attitude, setAttitude] = useState<string>('neutral')
  const [patrol, setPatrol] = useState<string>('moderate')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) { setError('Territory name is required'); return }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/world/place-territory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
        campaign_id: campaignId,
        name: name.trim(),
        faction: faction.trim() || null,
        color,
        polygon,
        law_level: lawLevel,
        attitude_to_strangers: attitude,
        patrol_intensity: patrol,
        notes: notes.trim() || null,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Failed to save territory')
      setSaving(false)
      return
    }

    const result: PlacedTerritoryResult = {
      ...json.data,
      polygon: (json.data.polygon ?? polygon) as Array<{ x: number; y: number }>,
    }
    onPlaced(result)
  }

  return (
    <div className="absolute inset-y-0 right-0 w-80 flex flex-col z-40 font-manrope" style={{
      background: 'rgba(14,16,19,0.97)',
      borderLeft: '1px solid rgba(255,198,55,0.1)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#282a2d]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-on-surface">New Territory</h2>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="text-xs text-on-surface-variant bg-[#1e2023] rounded-lg px-3 py-2">
          {polygon.length} vertices · double-click on map to finish polygon
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="The Kingdom of Ashveil"
            className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Faction / Ruler</label>
          <input
            value={faction}
            onChange={e => setFaction(e.target.value)}
            placeholder="House Ashveil, Bandit Clan..."
            className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Territory color</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c.hex,
                  outline: color === c.hex ? `2px solid white` : 'none',
                  outlineOffset: 2,
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Law level</label>
            <select
              value={lawLevel}
              onChange={e => setLawLevel(e.target.value)}
              className="w-full bg-[#1e2023] rounded-lg px-2 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50 capitalize"
            >
              {LAW_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Patrols</label>
            <select
              value={patrol}
              onChange={e => setPatrol(e.target.value)}
              className="w-full bg-[#1e2023] rounded-lg px-2 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50 capitalize"
            >
              {PATROL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Attitude to strangers</label>
          <div className="flex gap-1 flex-wrap">
            {ATTITUDES.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setAttitude(a)}
                className={`px-2 py-1 rounded text-[10px] capitalize transition-all ${attitude === a ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-[#1e2023] text-on-surface-variant hover:text-on-surface'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">DM notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Private notes about this territory..."
            className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
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
          Save Territory
        </button>
      </div>
    </div>
  )
}
