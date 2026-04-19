'use client'

import { useState } from 'react'
import { X, Eye, EyeOff, Compass, Trash2, Loader2 } from 'lucide-react'
import { POI_DEFINITIONS } from '@/lib/world/poiDefinitions'

interface MapPoIInfoCardProps {
  poi: {
    id: string
    x_pct: number
    y_pct: number
    poi_type: string
    poi_category: string
    name: string | null
    is_discovered: boolean
    is_visible_to_players?: boolean
    player_hint: string | null
    description: string | null
  }
  mapId: string
  x: number
  y: number
  containerWidth: number
  containerHeight: number
  onClose: () => void
  onUpdated: (poiId: string, patch: { is_discovered?: boolean; is_visible_to_players?: boolean }) => void
  onDeleted?: (poiId: string) => void
}

export function MapPoIInfoCard({
  poi, mapId, x, y, containerWidth, containerHeight, onClose, onUpdated, onDeleted,
}: MapPoIInfoCardProps) {
  const [isDiscovered, setIsDiscovered] = useState(poi.is_discovered)
  const [isVisibleToPlayers, setIsVisibleToPlayers] = useState(poi.is_visible_to_players ?? false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch('/api/world/delete-element', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'poi', elementId: poi.id, mapId }),
      })
      onDeleted?.(poi.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const def = POI_DEFINITIONS.find(d => d.type === poi.poi_type)

  const CARD_W = 288
  const CARD_H = 280
  const left = x + CARD_W > containerWidth - 16 ? x - CARD_W - 12 : x + 12
  const top = y + CARD_H > containerHeight - 16 ? Math.max(8, containerHeight - CARD_H - 8) : Math.max(8, y - 16)

  async function toggle(field: 'is_discovered' | 'is_visible_to_players', value: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/world/update-poi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poiId: poi.id, mapId, [field]: value }),
      })
      if (res.ok) {
        if (field === 'is_discovered') setIsDiscovered(value)
        if (field === 'is_visible_to_players') setIsVisibleToPlayers(value)
        onUpdated(poi.id, { [field]: value })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="absolute z-30 rounded-2xl shadow-2xl font-manrope overflow-hidden"
      style={{
        left, top, width: CARD_W,
        background: 'rgba(14,16,19,0.97)',
        border: '1px solid rgba(255,198,55,0.2)',
        backdropFilter: 'blur(16px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl leading-none mt-0.5">{def?.icon ?? '📍'}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-on-surface leading-tight truncate">
              {poi.name ?? def?.label ?? poi.poi_type.replace(/_/g, ' ')}
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5 capitalize">
              {def?.label ?? poi.poi_type.replace(/_/g, ' ')} · {poi.poi_category}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-on-surface-variant hover:text-rose-400 p-0.5 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button type="button" onClick={handleDelete} disabled={deleting} className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-[10px] px-2 py-0.5 rounded bg-[#282a2d] text-on-surface-variant">
                Cancel
              </button>
            </div>
          )}
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {poi.description && (
        <div className="px-4 pb-2 text-xs text-on-surface-variant">{poi.description}</div>
      )}

      {/* Player hint */}
      {poi.player_hint && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-[#1e2024] border border-[#282a2d] text-xs text-on-surface-variant italic">
          &ldquo;{poi.player_hint}&rdquo;
        </div>
      )}

      {/* Toggles */}
      <div className="px-4 pb-4 space-y-2 border-t border-[#282a2d] pt-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => toggle('is_discovered', !isDiscovered)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
            isDiscovered
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-[#1e2024] text-on-surface-variant border border-[#282a2d] hover:border-emerald-500/30 hover:text-emerald-400'
          }`}
        >
          <span className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" />
            Party discovered
          </span>
          <span>{isDiscovered ? 'Yes' : 'No'}</span>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => toggle('is_visible_to_players', !isVisibleToPlayers)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
            isVisibleToPlayers
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'bg-[#1e2024] text-on-surface-variant border border-[#282a2d] hover:border-sky-500/30 hover:text-sky-400'
          }`}
        >
          <span className="flex items-center gap-2">
            {isVisibleToPlayers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Visible on player map
          </span>
          <span>{isVisibleToPlayers ? 'Yes' : 'No'}</span>
        </button>
      </div>
    </div>
  )
}
