'use client'

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Eye, EyeOff, MapPin, Castle, Shield, BookOpen, Route } from 'lucide-react'
import { POI_DEFINITIONS } from '@/lib/world/poiDefinitions'

interface PlayerTown {
  id: string
  x_pct: number
  y_pct: number
  name: string | null
  town_tier: string | null
  wealth_score: number | null
  specializations: string[] | null
  shop_id: string | null
}

interface PlayerPoI {
  id: string
  x_pct: number
  y_pct: number
  poi_type: string
  name: string | null
  player_hint: string | null
  is_discovered: boolean
}

interface PlayerTerritory {
  id: string
  name: string
  faction: string | null
  color: string | null
  polygon: Array<{ x: number; y: number }>
  law_level: string | null
  attitude_to_strangers: string | null
}

interface PlayerHistEvent {
  id: string
  x_pct: number
  y_pct: number
  event_name: string
  event_type: string | null
  years_ago: number | null
}

interface PlayerTradeRoute {
  id: string
  town_a_id: string
  town_b_id: string
  primary_goods: string[] | null
  trade_volume: number | null
}

interface PlayerMapCanvasProps {
  map: {
    id: string
    image_url: string
    map_size: string
    map_style: string | null
  }
  campaignId: string
  campaignName: string
  worldTowns: PlayerTown[]
  pois: PlayerPoI[]
  territories: PlayerTerritory[]
  historicalEvents: PlayerHistEvent[]
  tradeRoutes: PlayerTradeRoute[]
}

interface TooltipState {
  x: number
  y: number
  title: string
  subtitle: string
  detail: string | null
}

function ToolbarToggle({ active, onToggle, label, icon }: {
  active: boolean; onToggle: () => void; label: string; icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'text-[#3f2e00] shadow-sm'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d]'
      }`}
      style={active ? { background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' } : undefined}
    >
      {icon}
      {label}
    </button>
  )
}

export function PlayerMapCanvas({
  map, campaignId, campaignName,
  worldTowns, pois, territories, historicalEvents, tradeRoutes,
}: PlayerMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [showPois, setShowPois] = useState(true)
  const [showTowns, setShowTowns] = useState(true)
  const [showTerritories, setShowTerritories] = useState(true)
  const [showHistory, setShowHistory] = useState(true)
  const [showTradeRoutes, setShowTradeRoutes] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [selectedTown, setSelectedTown] = useState<PlayerTown | null>(null)
  const [selectedPoi, setSelectedPoi] = useState<PlayerPoI | null>(null)

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  function containerDims() {
    return containerRef.current?.getBoundingClientRect() ?? null
  }

  function resolveTooltipPos(x: number, y: number): { left?: number; right?: number; top?: number; bottom?: number } {
    const dims = containerDims()
    if (!dims) return { left: x + 12, top: y + 12 }
    const right = dims.width - x < 220
    const bottom = dims.height - y < 100
    return {
      [right ? 'right' : 'left']: right ? dims.width - x + 12 : x + 12,
      [bottom ? 'bottom' : 'top']: bottom ? dims.height - y + 12 : y + 12,
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#111316] overflow-hidden font-manrope">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b border-[#282a2d] shrink-0 flex-wrap"
        style={{ background: 'rgba(14,16,19,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <Link
          href={`/player/campaigns/${campaignId}`}
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {campaignName}
        </Link>

        <div className="h-4 w-px bg-[#282a2d]" />

        <div className="flex items-center gap-1 flex-wrap">
          <ToolbarToggle active={showPois} onToggle={() => setShowPois(v => !v)} label="PoIs" icon={<MapPin className="w-3.5 h-3.5" />} />
          <ToolbarToggle active={showTowns} onToggle={() => setShowTowns(v => !v)} label="Towns" icon={<Castle className="w-3.5 h-3.5" />} />
          <ToolbarToggle active={showTerritories} onToggle={() => setShowTerritories(v => !v)} label="Territories" icon={<Shield className="w-3.5 h-3.5" />} />
          <ToolbarToggle active={showHistory} onToggle={() => setShowHistory(v => !v)} label="History" icon={<BookOpen className="w-3.5 h-3.5" />} />
          <ToolbarToggle active={showTradeRoutes} onToggle={() => setShowTradeRoutes(v => !v)} label="Routes" icon={<Route className="w-3.5 h-3.5" />} />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-on-surface-variant" />
          <span className="text-xs text-on-surface-variant">Player View</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-default"
          onMouseLeave={handleMouseLeave}
          onClick={() => { setSelectedTown(null); setSelectedPoi(null) }}
        >
          {/* Map image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={map.image_url}
            alt="Campaign map"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          {/* SVG overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1 1"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Trade routes */}
            {showTradeRoutes && tradeRoutes.map(route => {
              const a = worldTowns.find(t => t.id === route.town_a_id)
              const b = worldTowns.find(t => t.id === route.town_b_id)
              if (!a || !b) return null
              const mx = (a.x_pct + b.x_pct) / 2
              const my = (a.y_pct + b.y_pct) / 2
              const dx = b.x_pct - a.x_pct
              const dy = b.y_pct - a.y_pct
              const cx = mx - dy * 0.08
              const cy = my + dx * 0.08
              const vol = route.trade_volume ?? 5
              const strokeW = 0.002 + vol * 0.0008
              return (
                <path
                  key={route.id}
                  d={`M ${a.x_pct} ${a.y_pct} Q ${cx} ${cy} ${b.x_pct} ${b.y_pct}`}
                  fill="none"
                  stroke="#ffc637"
                  strokeWidth={strokeW}
                  strokeOpacity={0.45}
                  strokeDasharray={`${strokeW * 4} ${strokeW * 2}`}
                />
              )
            })}

            {/* Territories */}
            {showTerritories && territories.map(t => (
              <g key={t.id}>
                <polygon
                  points={t.polygon.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={t.color ?? '#3b82f6'}
                  fillOpacity={0.15}
                  stroke={t.color ?? '#3b82f6'}
                  strokeWidth={0.003}
                  strokeOpacity={0.6}
                />
                {t.polygon.length > 0 && (
                  <text
                    x={t.polygon.reduce((s, p) => s + p.x, 0) / t.polygon.length}
                    y={t.polygon.reduce((s, p) => s + p.y, 0) / t.polygon.length}
                    fontSize={0.016}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none' }}
                    opacity={0.8}
                  >
                    {t.name}
                  </text>
                )}
              </g>
            ))}

            {/* Historical events */}
            {showHistory && historicalEvents.map(ev => (
              <g
                key={ev.id}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (!rect) return
                  const x = ev.x_pct * rect.width
                  const y = ev.y_pct * rect.height
                  setTooltip({
                    x, y,
                    title: ev.event_name,
                    subtitle: ev.event_type
                      ? `${ev.event_type.replace(/_/g, ' ')}${ev.years_ago ? ` · ${ev.years_ago} years ago` : ''}`
                      : ev.years_ago ? `${ev.years_ago} years ago` : '',
                    detail: null,
                  })
                }}
              >
                <circle cx={ev.x_pct} cy={ev.y_pct} r={0.009} fill="#f59e0b" stroke="#78350f" strokeWidth={0.002} />
                <text x={ev.x_pct} y={ev.y_pct} fontSize={0.010} fill="#78350f" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>!</text>
              </g>
            ))}

            {/* PoIs */}
            {showPois && pois.map(poi => {
              const def = POI_DEFINITIONS.find(d => d.type === poi.poi_type)
              const color = def?.mapColor ?? '#9e9e9e'
              return (
                <g
                  key={poi.id}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTown(null)
                    setSelectedPoi(poi)
                    setTooltip(null)
                  }}
                >
                  <circle cx={poi.x_pct} cy={poi.y_pct} r={0.009} fill={color} stroke="white" strokeWidth={0.0015} fillOpacity={0.9} />
                </g>
              )
            })}

            {/* Towns */}
            {showTowns && worldTowns.map(town => (
              <g
                key={town.id}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedPoi(null)
                  setSelectedTown(town)
                  setTooltip(null)
                }}
              >
                <circle cx={town.x_pct} cy={town.y_pct} r={0.014} fill="#ffc637" stroke="#3f2e00" strokeWidth={0.002} />
                <text
                  x={town.x_pct} y={town.y_pct}
                  fontSize={0.010} fill="#3f2e00"
                  textAnchor="middle" dominantBaseline="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {(town.town_tier ?? 'hamlet').charAt(0).toUpperCase()}
                </text>
              </g>
            ))}
          </svg>

          {/* Hover tooltip */}
          {tooltip && (
            <div
              className="absolute z-30 pointer-events-none"
              style={resolveTooltipPos(tooltip.x, tooltip.y)}
            >
              <div className="rounded-xl px-3 py-2.5 shadow-xl text-xs max-w-[200px]" style={{
                background: 'rgba(14,16,19,0.95)',
                border: '1px solid rgba(255,198,55,0.15)',
                backdropFilter: 'blur(12px)',
              }}>
                <div className="font-semibold text-on-surface">{tooltip.title}</div>
                {tooltip.subtitle && <div className="text-on-surface-variant mt-0.5">{tooltip.subtitle}</div>}
                {tooltip.detail && <div className="text-on-surface-variant mt-0.5">{tooltip.detail}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Town info card */}
        {selectedTown && (
          <PlayerTownCard
            town={selectedTown}
            campaignId={campaignId}
            onClose={() => setSelectedTown(null)}
          />
        )}

        {/* PoI info card */}
        {selectedPoi && (
          <PlayerPoICard
            poi={selectedPoi}
            onClose={() => setSelectedPoi(null)}
          />
        )}
      </div>
    </div>
  )
}

function PlayerTownCard({ town, campaignId, onClose }: { town: PlayerTown; campaignId: string; onClose: () => void }) {
  const tierLabels: Record<string, string> = {
    hamlet: 'Hamlet', village: 'Village', town: 'Town', city: 'City', metropolis: 'Metropolis',
  }
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-80 rounded-2xl shadow-2xl font-manrope"
      style={{ background: 'rgba(14,16,19,0.97)', border: '1px solid rgba(255,198,55,0.2)', backdropFilter: 'blur(16px)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-on-surface">{town.name ?? 'Unnamed Town'}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{tierLabels[town.town_tier ?? 'hamlet'] ?? 'Settlement'}</p>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-lg leading-none">×</button>
      </div>
      {town.specializations && town.specializations.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {town.specializations.map(s => (
            <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-[#282a2d] text-on-surface-variant capitalize">{s.replace(/_/g,' ')}</span>
          ))}
        </div>
      )}
      <div className="px-4 pb-4 flex gap-2">
        {town.shop_id && (
          <Link
            href={`/player/campaigns/${campaignId}/shops/${town.shop_id}`}
            className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-semibold text-[#3f2e00]"
            style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
          >
            Browse Shop
          </Link>
        )}
      </div>
    </div>
  )
}

function PlayerPoICard({ poi, onClose }: { poi: PlayerPoI; onClose: () => void }) {
  const def = POI_DEFINITIONS.find(d => d.type === poi.poi_type)
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-72 rounded-2xl shadow-2xl font-manrope"
      style={{ background: 'rgba(14,16,19,0.97)', border: '1px solid rgba(255,198,55,0.2)', backdropFilter: 'blur(16px)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-2xl">{def?.icon ?? '📍'}</span>
          <div>
            <h3 className="font-semibold text-on-surface">{poi.name ?? def?.label ?? 'Point of Interest'}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{def?.label ?? poi.poi_type.replace(/_/g,' ')}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-lg leading-none ml-2">×</button>
      </div>
      {poi.player_hint && (
        <div className="px-4 pb-4 text-xs text-on-surface-variant italic border-t border-[#282a2d] pt-3">
          &ldquo;{poi.player_hint}&rdquo;
        </div>
      )}
    </div>
  )
}
