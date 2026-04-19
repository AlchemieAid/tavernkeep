'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { IDWResult } from '@/lib/world/resourceInterpolation'
import { wealthLabel } from '@/lib/world/wealthField'
import { elevationLabel } from '@/lib/world/elevation'

interface MapMobileModalProps {
  idwResult: IDWResult
  terrainType: string | null
  onClose: () => void
}

const SCORE_BARS: Array<{ key: keyof IDWResult['scores']; label: string; color: string }> = [
  { key: 'mining',        label: 'Mining',        color: '#78909c' },
  { key: 'agriculture',   label: 'Agriculture',   color: '#4caf50' },
  { key: 'fishing',       label: 'Fishing',       color: '#42a5f5' },
  { key: 'forestry',      label: 'Forestry',      color: '#388e3c' },
  { key: 'trade_access',  label: 'Trade',         color: '#ff7043' },
  { key: 'water_access',  label: 'Water',         color: '#29b6f6' },
]

export function MapMobileModal({ idwResult, terrainType, onClose }: MapMobileModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { scores, elevation_m, dominantTerrain } = idwResult
  const wealth = wealthLabel(
    Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length
  )
  const elevLabel = elevationLabel(elevation_m)

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="w-full rounded-t-2xl font-manrope"
        style={{
          background: 'rgba(14,16,19,0.98)',
          border: '1px solid rgba(255,198,55,0.12)',
          borderBottom: 'none',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <div className="text-sm font-noto-serif text-on-surface capitalize">
              {dominantTerrain.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-on-surface-variant mt-0.5">
              {elevLabel} · {wealth} wealth
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-2 space-y-2.5">
          {SCORE_BARS.map(({ key, label, color }) => {
            const val = scores[key] ?? 0
            const pct = Math.round(Math.min(val * 100, 100))
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-on-surface-variant">{label}</span>
                  <span className="text-xs font-semibold" style={{ color }}>{pct}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#282a2d] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {terrainType && (
          <div className="px-5 pb-4 pt-2">
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Terrain</div>
            <div className="text-xs text-on-surface capitalize">{terrainType.replace(/_/g, ' ')}</div>
          </div>
        )}

        <div className="h-1 w-10 bg-[#444] rounded-full mx-auto mb-4" />
      </div>
    </div>
  )
}
