'use client'

import type { IDWResult } from '@/lib/world/resourceInterpolation'
import { computeWealthScore, wealthLabel } from '@/lib/world/wealthField'
import { elevationLabel } from '@/lib/world/elevation'

interface TerrainAreaData {
  terrain_type: string
  climate_zone?: string | null
  temp_summer_high_c?: number | null
  temp_winter_low_c?: number | null
  ecosystem_flora?: string[] | null
  ecosystem_fauna?: string[] | null
  hazards?: Array<{ type: string; season: string; probability: string }> | null
}

interface MapHoverTooltipProps {
  x: number
  y: number
  idwResult: IDWResult
  terrainArea?: TerrainAreaData | null
  containerWidth: number
  containerHeight: number
}

const SCORE_LABELS: Array<{ key: keyof IDWResult['scores']; label: string }> = [
  { key: 'agriculture',  label: 'Agriculture'  },
  { key: 'water_access', label: 'Water access' },
  { key: 'trade_access', label: 'Trade access' },
  { key: 'mining',       label: 'Mining'       },
  { key: 'fishing',      label: 'Fishing'      },
  { key: 'forestry',     label: 'Forestry'     },
]

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-right text-[10px] text-on-surface-variant font-manrope shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#282a2d] overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-[10px] text-on-surface-variant font-manrope tabular-nums">{pct}%</span>
    </div>
  )
}

export function MapHoverTooltip({
  x,
  y,
  idwResult,
  terrainArea,
  containerWidth,
  containerHeight,
}: MapHoverTooltipProps) {
  const wealthScore = computeWealthScore(idwResult.scores)
  const label = wealthLabel(wealthScore)
  const elevLabel = elevationLabel(idwResult.elevation_m)

  const terrainLabel = (idwResult.dominantTerrain ?? 'plains')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  const TOOLTIP_W = 256
  const TOOLTIP_H = 280
  const MARGIN = 16

  const flipLeft = x + TOOLTIP_W + MARGIN > containerWidth
  const flipUp   = y + TOOLTIP_H + MARGIN > containerHeight

  const tooltipX = flipLeft ? x - TOOLTIP_W - 12 : x + 16
  const tooltipY = flipUp   ? y - TOOLTIP_H - 12  : y + 16

  const flora = terrainArea?.ecosystem_flora?.slice(0, 3).join(', ')
  const fauna = terrainArea?.ecosystem_fauna?.slice(0, 3).join(', ')
  const hazardList = (terrainArea?.hazards as Array<{ type: string; season: string }> | null)
    ?.slice(0, 2)
    .map(h => `${h.type.replace(/_/g, ' ')} (${h.season})`)
    .join(', ')

  return (
    <div
      className="absolute z-50 pointer-events-none select-none"
      style={{ left: tooltipX, top: tooltipY, width: TOOLTIP_W }}
    >
      <div
        className="rounded-xl p-4 space-y-3 font-manrope text-xs"
        style={{
          background: 'rgba(14,16,19,0.97)',
          border: '1px solid rgba(255,198,55,0.12)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div>
          <div className="text-sm font-semibold text-on-surface">{terrainLabel}</div>
          <div className="text-on-surface-variant">
            ~{Math.round(idwResult.elevation_m)}m &middot; {elevLabel}
          </div>
        </div>

        <div className="space-y-1.5">
          {SCORE_LABELS.map(({ key, label }) => (
            <ScoreBar key={key} label={label} value={idwResult.scores[key]} />
          ))}
        </div>

        {terrainArea?.climate_zone && (
          <div className="border-t border-[#282a2d] pt-2 space-y-0.5">
            <div className="text-on-surface-variant">
              <span className="text-on-surface">Climate</span>{' '}
              {terrainArea.climate_zone.replace(/_/g, ' ')}
            </div>
            {terrainArea.temp_summer_high_c != null && terrainArea.temp_winter_low_c != null && (
              <div className="text-on-surface-variant">
                {Math.round(terrainArea.temp_summer_high_c)}°C summer &middot; {Math.round(terrainArea.temp_winter_low_c)}°C winter
              </div>
            )}
          </div>
        )}

        {(flora || fauna) && (
          <div className="border-t border-[#282a2d] pt-2 space-y-0.5">
            {flora && <div className="text-on-surface-variant"><span className="text-on-surface">Flora</span> {flora}</div>}
            {fauna && <div className="text-on-surface-variant"><span className="text-on-surface">Fauna</span> {fauna}</div>}
          </div>
        )}

        {hazardList && (
          <div className="border-t border-[#282a2d] pt-2">
            <div className="text-on-surface-variant"><span className="text-on-surface">Hazards</span> {hazardList}</div>
          </div>
        )}

        <div className="border-t border-[#282a2d] pt-2">
          <div className="flex items-center justify-between">
            <span className="text-on-surface">Wealth</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-sm"
                    style={{ background: i < Math.round(wealthScore * 7) ? '#ffc637' : '#282a2d' }}
                  />
                ))}
              </div>
              <span className="text-on-surface-variant">{label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
