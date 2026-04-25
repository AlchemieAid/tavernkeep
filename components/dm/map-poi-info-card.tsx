'use client'

import { useState } from 'react'
import { X, Eye, EyeOff, Compass, Trash2, Loader2, Pencil, Check } from 'lucide-react'
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
  onUpdated: (poiId: string, patch: Partial<{ is_discovered: boolean; is_visible_to_players: boolean; name: string | null; description: string | null; player_hint: string | null }>) => void
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

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(poi.name ?? '')
  const [editDesc, setEditDesc] = useState(poi.description ?? '')
  const [editHint, setEditHint] = useState(poi.player_hint ?? '')
  const [savingEdit, setSavingEdit] = useState(false)

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

  const CARD_W = 296
  const CARD_H = editing ? 420 : 300
  const left = x + CARD_W > containerWidth - 16 ? x - CARD_W - 12 : x + 12
  const top = y + CARD_H > containerHeight - 16 ? Math.max(8, containerHeight - CARD_H - 8) : Math.max(8, y - 16)

  async function handleSaveEdit() {
    setSavingEdit(true)
    try {
      const patch = {
        name: editName.trim() || null,
        description: editDesc.trim() || null,
        player_hint: editHint.trim() || null,
      }
      const res = await fetch('/api/world/update-poi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poiId: poi.id, mapId, ...patch }),
      })
      if (res.ok) {
        onUpdated(poi.id, patch)
        setEditing(false)
      }
    } finally {
      setSavingEdit(false)
    }
  }

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
          <button
            type="button"
            onClick={() => setEditing(v => !v)}
            title="Edit details"
            className={`p-0.5 transition-colors ${editing ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
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

      {/* Inline edit form */}
      {editing && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-[#282a2d] pt-3">
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder={def?.label ?? poi.poi_type}
              className="w-full bg-[#1e2024] border border-[#282a2d] rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Description</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="What the DM knows about this location…"
              className="w-full bg-[#1e2024] border border-[#282a2d] rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/40 resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Player hint</label>
            <input
              type="text"
              value={editHint}
              onChange={e => setEditHint(e.target.value)}
              placeholder="What players sense or hear…"
              className="w-full bg-[#1e2024] border border-[#282a2d] rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors disabled:opacity-50"
            >
              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg bg-[#1e2024] text-on-surface-variant text-xs hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <>
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

          {/* Auto-generated nudge */}
          {!poi.description && !poi.player_hint && !poi.name && (
            <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-[#1e2024] border border-dashed border-[#282a2d] text-[11px] text-on-surface-variant">
              Auto-generated —{' '}
              <button type="button" onClick={() => setEditing(true)} className="text-primary underline underline-offset-2">
                add details
              </button>
            </div>
          )}
        </>
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

