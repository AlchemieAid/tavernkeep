'use client'

import { useState } from 'react'
import { X, Loader2, Check, BookOpen } from 'lucide-react'

export interface PlacedHistoricalEventResult {
  id: string
  x_pct: number
  y_pct: number
  event_name: string
  event_type: string | null
  years_ago: number | null
  description: string | null
  lingering_effect: string | null
  is_known_to_players: boolean | null
}

interface MapHistoricalEventPanelProps {
  campaignId: string
  mapId: string
  xPct: number
  yPct: number
  onClose: () => void
  onPlaced: (event: PlacedHistoricalEventResult) => void
}

const EVENT_TYPES = [
  { value: 'battle',    icon: '⚔️', label: 'Battle'    },
  { value: 'disaster',  icon: '🌊', label: 'Disaster'  },
  { value: 'founding',  icon: '🏛',  label: 'Founding'  },
  { value: 'treaty',    icon: '📜', label: 'Treaty'    },
  { value: 'discovery', icon: '🔭', label: 'Discovery' },
  { value: 'plague',    icon: '💀', label: 'Plague'    },
  { value: 'miracle',   icon: '✨', label: 'Miracle'   },
  { value: 'conquest',  icon: '🏴', label: 'Conquest'  },
  { value: 'collapse',  icon: '💥', label: 'Collapse'  },
  { value: 'other',     icon: '📌', label: 'Other'     },
]

export function MapHistoricalEventPanel({ campaignId, mapId, xPct, yPct, onClose, onPlaced }: MapHistoricalEventPanelProps) {
  const [eventName, setEventName] = useState('')
  const [eventType, setEventType] = useState<string>('other')
  const [yearsAgo, setYearsAgo] = useState<string>('')
  const [description, setDescription] = useState('')
  const [lingeringEffect, setLingeringEffect] = useState('')
  const [knownToPlayers, setKnownToPlayers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!eventName.trim()) { setError('Event name is required'); return }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/world/place-historical-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
        campaign_id: campaignId,
        event_name: eventName.trim(),
        event_type: eventType,
        x_pct: xPct,
        y_pct: yPct,
        years_ago: yearsAgo ? parseInt(yearsAgo, 10) : null,
        description: description.trim() || null,
        lingering_effect: lingeringEffect.trim() || null,
        is_known_to_players: knownToPlayers,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Failed to save event')
      setSaving(false)
      return
    }

    onPlaced(json.data as PlacedHistoricalEventResult)
  }

  const selectedType = EVENT_TYPES.find(t => t.value === eventType)

  return (
    <div className="absolute inset-y-0 right-0 w-80 flex flex-col z-40 font-manrope" style={{
      background: 'rgba(14,16,19,0.97)',
      borderLeft: '1px solid rgba(255,198,55,0.1)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#282a2d]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-on-surface">Historical Event</h2>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Event type</label>
          <div className="grid grid-cols-5 gap-1">
            {EVENT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setEventType(t.value)}
                title={t.label}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs transition-all ${
                  eventType === t.value ? 'bg-primary/20 ring-1 ring-primary/30' : 'bg-[#1e2023] hover:bg-[#282a2d]'
                }`}
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span className="text-[8px] text-on-surface-variant leading-none">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Event name *</label>
          <input
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder={`The ${selectedType?.label ?? 'Event'} of...`}
            className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Years ago <span className="normal-case font-normal text-on-surface-variant/50">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            value={yearsAgo}
            onChange={e => setYearsAgo(e.target.value)}
            placeholder="e.g. 200"
            className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Description <span className="normal-case font-normal text-on-surface-variant/50">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What happened here? Who was involved?"
            className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Lingering effect <span className="normal-case font-normal text-on-surface-variant/50">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={lingeringEffect}
            onChange={e => setLingeringEffect(e.target.value)}
            placeholder="How does this event still affect the region today?"
            className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={knownToPlayers}
            onChange={e => setKnownToPlayers(e.target.checked)}
            className="w-4 h-4 rounded accent-[#ffc637]"
          />
          <div>
            <div className="text-xs text-on-surface">Known to players</div>
            <div className="text-[10px] text-on-surface-variant">Show this on the player-facing map</div>
          </div>
        </label>

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
          Record Event
        </button>
      </div>
    </div>
  )
}
