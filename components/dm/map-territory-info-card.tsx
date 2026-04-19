'use client'

import { X, Shield } from 'lucide-react'

const LAW_LABELS: Record<string, string> = {
  lawless: 'Lawless', low: 'Low', moderate: 'Moderate', strict: 'Strict', absolute: 'Absolute',
}
const ATTITUDE_LABELS: Record<string, string> = {
  hostile: 'Hostile', suspicious: 'Suspicious', neutral: 'Neutral',
  welcoming: 'Welcoming', open: 'Open',
}

interface MapTerritoryInfoCardProps {
  territory: {
    id: string
    name: string
    faction: string | null
    color: string | null
    law_level: string | null
    attitude_to_strangers: string | null
  }
  x: number
  y: number
  containerWidth: number
  containerHeight: number
  onClose: () => void
}

export function MapTerritoryInfoCard({
  territory, x, y, containerWidth, containerHeight, onClose,
}: MapTerritoryInfoCardProps) {
  const CARD_W = 256
  const CARD_H = 220
  const left = x + CARD_W > containerWidth - 16 ? x - CARD_W - 12 : x + 12
  const top = y + CARD_H > containerHeight - 16 ? Math.max(8, containerHeight - CARD_H - 8) : Math.max(8, y - 16)

  const color = territory.color ?? '#3b82f6'

  return (
    <div
      className="absolute z-30 rounded-2xl shadow-2xl font-manrope overflow-hidden"
      style={{
        left, top, width: CARD_W,
        background: 'rgba(14,16,19,0.97)',
        border: `1px solid ${color}40`,
        backdropFilter: 'blur(16px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="px-4 pt-3 pb-2.5 flex items-start justify-between gap-2"
        style={{ borderBottom: `1px solid ${color}30` }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0" style={{ color }} />
          <div>
            <h3 className="font-semibold text-sm text-on-surface leading-tight">{territory.name}</h3>
            {territory.faction && (
              <p className="text-[11px] text-on-surface-variant mt-0.5">{territory.faction}</p>
            )}
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-2">
        {territory.law_level && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Law level</span>
            <span className="font-medium text-on-surface">{LAW_LABELS[territory.law_level] ?? territory.law_level}</span>
          </div>
        )}
        {territory.attitude_to_strangers && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Attitude to strangers</span>
            <span
              className={`font-medium ${
                territory.attitude_to_strangers === 'hostile' ? 'text-rose-400'
                : territory.attitude_to_strangers === 'suspicious' ? 'text-amber-400'
                : territory.attitude_to_strangers === 'welcoming' || territory.attitude_to_strangers === 'open' ? 'text-emerald-400'
                : 'text-on-surface'
              }`}
            >
              {ATTITUDE_LABELS[territory.attitude_to_strangers] ?? territory.attitude_to_strangers}
            </span>
          </div>
        )}
        {!territory.law_level && !territory.attitude_to_strangers && (
          <p className="text-xs text-on-surface-variant">No additional details recorded.</p>
        )}
      </div>
    </div>
  )
}
