'use client'

import { useState } from 'react'
import { X, BookOpen, Users } from 'lucide-react'

const EVENT_TYPE_ICONS: Record<string, string> = {
  battle: '⚔️', founding: '🏛', disaster: '🌋', treaty: '📜',
  prophecy: '🔮', discovery: '🗺', assassination: '🗡', miracle: '✨',
  plague: '☠️', coronation: '👑',
}

interface MapHistEventInfoCardProps {
  event: {
    id: string
    event_name: string
    event_type: string | null
    years_ago: number | null
    is_known_to_players: boolean | null
  }
  mapId: string
  x: number
  y: number
  containerWidth: number
  containerHeight: number
  onClose: () => void
  onUpdated: (eventId: string, patch: { is_known_to_players: boolean }) => void
}

export function MapHistEventInfoCard({
  event, mapId, x, y, containerWidth, containerHeight, onClose, onUpdated,
}: MapHistEventInfoCardProps) {
  const [isKnown, setIsKnown] = useState(event.is_known_to_players ?? false)
  const [saving, setSaving] = useState(false)

  const CARD_W = 272
  const CARD_H = 200
  const left = x + CARD_W > containerWidth - 16 ? x - CARD_W - 12 : x + 12
  const top = y + CARD_H > containerHeight - 16 ? Math.max(8, containerHeight - CARD_H - 8) : Math.max(8, y - 16)

  const icon = event.event_type ? (EVENT_TYPE_ICONS[event.event_type] ?? '📖') : '📖'

  async function toggleKnown() {
    setSaving(true)
    try {
      const res = await fetch('/api/world/update-historical-event', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, mapId, is_known_to_players: !isKnown }),
      })
      if (res.ok) {
        setIsKnown(v => !v)
        onUpdated(event.id, { is_known_to_players: !isKnown })
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
        border: '1px solid rgba(245,158,11,0.25)',
        backdropFilter: 'blur(16px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl leading-none mt-0.5">{icon}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-on-surface leading-tight">{event.event_name}</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {event.event_type?.replace(/_/g, ' ') ?? 'Historical Event'}
              {event.years_ago != null && ` · ${event.years_ago} years ago`}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-2 border-t border-[#282a2d] pt-3">
        <p className="text-[11px] text-on-surface-variant mb-3">
          <BookOpen className="w-3 h-3 inline mr-1.5 opacity-60" />
          Control what players can see about this event on their map.
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={toggleKnown}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
            isKnown
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-[#1e2024] text-on-surface-variant border border-[#282a2d] hover:border-amber-500/30 hover:text-amber-400'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Known to players
          </span>
          <span>{isKnown ? 'Yes' : 'No'}</span>
        </button>
      </div>
    </div>
  )
}
