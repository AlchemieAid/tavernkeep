'use client'

import { useState } from 'react'
import { X, Loader2, Check, Layers } from 'lucide-react'

export interface AddedTerrainArea {
  id: string
  terrain_type: string
  polygon: Array<{ x: number; y: number }>
  climate_zone: string | null
  computed_elevation_m: number | null
  atmosphere_text: string | null
}

interface MapTerrainPainterPanelProps {
  campaignId: string
  mapId: string
  polygon: Array<{ x: number; y: number }> | null
  drawingPointCount: number
  selectedType: string
  onSelectType: (type: string) => void
  onClose: () => void
  onSaved: (area: AddedTerrainArea) => void
  onClearPolygon: () => void
}

const TERRAIN_GROUPS: Array<{ label: string; emoji: string; types: Array<{ value: string; label: string; emoji: string; color: string }> }> = [
  {
    label: 'Water', emoji: '🌊',
    types: [
      { value: 'ocean',      label: 'Ocean',      emoji: '🌊', color: '#1565c0' },
      { value: 'deep_sea',   label: 'Deep Sea',   emoji: '🌊', color: '#0d47a1' },
      { value: 'coast',      label: 'Coast',      emoji: '🏖',  color: '#42a5f5' },
      { value: 'river',      label: 'River',      emoji: '🏞',  color: '#29b6f6' },
      { value: 'lake',       label: 'Lake',       emoji: '🏞',  color: '#26c6da' },
    ],
  },
  {
    label: 'Lowlands', emoji: '🌿',
    types: [
      { value: 'plains',     label: 'Plains',     emoji: '🌾', color: '#aed581' },
      { value: 'grassland',  label: 'Grassland',  emoji: '🌿', color: '#66bb6a' },
      { value: 'farmland',   label: 'Farmland',   emoji: '🌾', color: '#cddc39' },
      { value: 'wetlands',   label: 'Wetlands',   emoji: '🦆', color: '#558b2f' },
      { value: 'swamp',      label: 'Swamp',      emoji: '🐊', color: '#4e342e' },
    ],
  },
  {
    label: 'Forest', emoji: '🌲',
    types: [
      { value: 'forest',        label: 'Forest',      emoji: '🌲', color: '#388e3c' },
      { value: 'deep_forest',   label: 'Deep Forest', emoji: '🌲', color: '#1b5e20' },
      { value: 'jungle',        label: 'Jungle',      emoji: '🌴', color: '#2e7d32' },
    ],
  },
  {
    label: 'Highland', emoji: '⛰',
    types: [
      { value: 'hills',           label: 'Hills',       emoji: '⛰',  color: '#a1887f' },
      { value: 'highlands',       label: 'Highlands',   emoji: '⛰',  color: '#8d6e63' },
      { value: 'mountains',       label: 'Mountains',   emoji: '🏔',  color: '#78909c' },
      { value: 'high_mountains',  label: 'High Mtns',   emoji: '🏔',  color: '#546e7a' },
    ],
  },
  {
    label: 'Extreme', emoji: '🏜',
    types: [
      { value: 'desert',   label: 'Desert',   emoji: '🏜',  color: '#ffd54f' },
      { value: 'tundra',   label: 'Tundra',   emoji: '❄️',  color: '#b0bec5' },
      { value: 'glacier',  label: 'Glacier',  emoji: '🧊',  color: '#e0f7fa' },
      { value: 'volcano',  label: 'Volcano',  emoji: '🌋',  color: '#e53935' },
    ],
  },
]

export function MapTerrainPainterPanel({
  campaignId, mapId, polygon, drawingPointCount,
  selectedType, onSelectType,
  onClose, onSaved, onClearPolygon,
}: MapTerrainPainterPanelProps) {
  const [climateZone, setClimateZone] = useState('')
  const [elevationM, setElevationM] = useState('')
  const [atmosphereText, setAtmosphereText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = polygon && polygon.length >= 3

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/world/add-terrain-area', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
        campaign_id: campaignId,
        terrain_type: selectedType,
        polygon,
        computed_elevation_m: elevationM ? parseFloat(elevationM) : null,
        climate_zone: climateZone.trim() || null,
        atmosphere_text: atmosphereText.trim() || null,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Failed to save terrain area')
      setSaving(false)
      return
    }

    const result: AddedTerrainArea = {
      ...json.data,
      polygon: (json.data.polygon ?? polygon) as Array<{ x: number; y: number }>,
    }
    setSaving(false)
    onSaved(result)
    onClearPolygon()
  }

  const selectedTypeDef = TERRAIN_GROUPS.flatMap(g => g.types).find(t => t.value === selectedType)

  return (
    <div className="absolute inset-y-0 right-0 w-80 flex flex-col z-40 font-manrope" style={{
      background: 'rgba(14,16,19,0.97)',
      borderLeft: '1px solid rgba(255,198,55,0.1)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#282a2d]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-on-surface">Terrain Painter</h2>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-lg bg-[#1e2023] px-3 py-2 text-xs text-on-surface-variant flex items-center justify-between">
          <span>
            {drawingPointCount === 0
              ? 'Click on the map to start drawing'
              : drawingPointCount < 3
              ? `${drawingPointCount} pts — need at least 3`
              : `${drawingPointCount} pts · double-click to close`}
          </span>
          {drawingPointCount > 0 && (
            <button type="button" onClick={onClearPolygon} className="text-[10px] text-[#ffb4ab] hover:text-[#ff7270]">
              Clear
            </button>
          )}
        </div>

        {selectedTypeDef && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${selectedTypeDef.color}22`, border: `1px solid ${selectedTypeDef.color}44` }}>
            <span className="text-lg">{selectedTypeDef.emoji}</span>
            <div>
              <div className="text-xs font-semibold text-on-surface">{selectedTypeDef.label}</div>
              <div className="text-[10px] text-on-surface-variant">Selected terrain type</div>
            </div>
          </div>
        )}

        {TERRAIN_GROUPS.map(group => (
          <div key={group.label} className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span>{group.emoji}</span> {group.label}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {group.types.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onSelectType(t.value)}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-[9px] transition-all leading-tight ${
                    selectedType === t.value ? 'ring-2 ring-white/40' : 'hover:bg-[#282a2d]'
                  }`}
                  style={{
                    background: selectedType === t.value ? `${t.color}33` : undefined,
                    border: `1px solid ${t.color}${selectedType === t.value ? '88' : '22'}`,
                  }}
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-on-surface-variant text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-[#282a2d] pt-3 space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Optional details</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant">Climate zone</label>
              <input
                value={climateZone}
                onChange={e => setClimateZone(e.target.value)}
                placeholder="temperate..."
                className="w-full bg-[#1e2023] rounded px-2 py-1.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant">Elevation (m)</label>
              <input
                type="number"
                value={elevationM}
                onChange={e => setElevationM(e.target.value)}
                placeholder="0"
                className="w-full bg-[#1e2023] rounded px-2 py-1.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant">Atmosphere note</label>
            <textarea
              rows={2}
              value={atmosphereText}
              onChange={e => setAtmosphereText(e.target.value)}
              placeholder="The air smells of pine and frost..."
              className="w-full bg-[#1e2023] rounded px-2 py-1.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
          </div>
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
          Done
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-[#3f2e00] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save Area
        </button>
      </div>
    </div>
  )
}
