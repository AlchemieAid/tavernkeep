'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Eye, EyeOff, MapPin, Castle, Crosshair } from 'lucide-react'
import { computeIDW, type IDWResult, type ResourcePoint, type TerrainArea, type PlacedPoI } from '@/lib/world/resourceInterpolation'
import { MapHoverTooltip } from './map-hover-tooltip'
import { MapPoIPanel, type PlacedPoIResult } from './map-poi-panel'
import { MapTownPanel, type PlacedTownResult } from './map-town-panel'
import { POI_DEFINITIONS } from '@/lib/world/poiDefinitions'

const RESOURCE_COLORS: Record<string, string> = {
  iron_deposit:     '#78909c',
  copper_deposit:   '#b87333',
  gold_vein:        '#ffd700',
  silver_vein:      '#c0c0c0',
  gem_cluster:      '#ce93d8',
  coal_seam:        '#546e7a',
  stone_quarry:     '#a1887f',
  salt_flat:        '#eceff1',
  sulfur_vent:      '#fff176',
  deep_fishery:     '#1565c0',
  coastal_fishery:  '#42a5f5',
  river_fishery:    '#4fc3f7',
  fertile_farmland: '#4caf50',
  grazing_land:     '#8bc34a',
  orchard:          '#ff9800',
  ancient_forest:   '#1b5e20',
  managed_woodland: '#388e3c',
  rare_herbs:       '#ab47bc',
  natural_harbor:   '#0288d1',
  river_ford:       '#29b6f6',
  mountain_pass:    '#78909c',
  trade_crossroads: '#ff7043',
  oasis:            '#00bcd4',
  river_confluence: '#0097a7',
  arcane_nexus:     '#e040fb',
  ancient_ruins:    '#8d6e63',
  volcanic_soil:    '#ef5350',
  hot_springs:      '#ff8a65',
}

function getResourceColor(type: string): string {
  return RESOURCE_COLORS[type] ?? '#9e9e9e'
}

type Mode = 'view' | 'town' | 'poi'

interface WorldTown {
  id: string
  x_pct: number
  y_pct: number
  name: string | null
  town_tier: string | null
  wealth_score: number | null
  specializations: string[] | null
}

interface PoI {
  id: string
  x_pct: number
  y_pct: number
  poi_type: string
  poi_category: string
  name: string | null
  is_discovered: boolean
  player_hint: string | null
  description: string | null
}

interface MapCanvasProps {
  map: {
    id: string
    image_url: string
    map_size: string
    map_style: string | null
    setup_stage: string
  }
  campaignId: string
  campaignName: string
  terrainAreas: TerrainArea[]
  resourcePoints: ResourcePoint[]
  worldTowns: WorldTown[]
  pois: PoI[]
}

const THROTTLE_MS = 32

export function MapCanvas({
  map,
  campaignId,
  campaignName,
  terrainAreas,
  resourcePoints: initialResourcePoints,
  worldTowns: initialWorldTowns,
  pois: initialPois,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMoveRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  const [showResources, setShowResources] = useState(true)
  const [showPois, setShowPois] = useState(true)
  const [showTowns, setShowTowns] = useState(true)
  const [mode, setMode] = useState<Mode>('view')

  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; xPct: number; yPct: number } | null>(null)
  const [idwResult, setIdwResult] = useState<IDWResult | null>(null)

  const [resourcePoints, setResourcePoints] = useState(initialResourcePoints)
  const [worldTowns, setWorldTowns] = useState(initialWorldTowns)
  const [pois, setPois] = useState(initialPois)

  const [poiPanelOpen, setPoiPanelOpen] = useState(false)
  const [townPanel, setTownPanel] = useState<{ xPct: number; yPct: number; result: IDWResult } | null>(null)

  const placedPoIs = useMemo<PlacedPoI[]>(() =>
    pois.map(p => ({ id: p.id, x_pct: p.x_pct, y_pct: p.y_pct, poi_type: p.poi_type })),
    [pois]
  )

  const hoveredTerrainArea = useMemo(() => {
    if (!idwResult) return null
    return terrainAreas.find(a => a.terrain_type === idwResult.dominantTerrain) ?? null
  }, [idwResult, terrainAreas])

  function getCanvasCoords(e: React.MouseEvent): { x: number; y: number; xPct: number; yPct: number } | null {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    return { x, y, xPct: x / rect.width, yPct: y / rect.height }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastMoveRef.current < THROTTLE_MS) return
    lastMoveRef.current = now

    const coords = getCanvasCoords(e)
    if (!coords) return
    setHoverPos(coords)

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const result = computeIDW(coords.xPct, coords.yPct, resourcePoints, terrainAreas, placedPoIs)
      setIdwResult(result)
    })
  }, [resourcePoints, terrainAreas, placedPoIs])

  function handleMouseLeave() {
    setHoverPos(null)
    setIdwResult(null)
  }

  function handleMapClick(e: React.MouseEvent) {
    const coords = getCanvasCoords(e)
    if (!coords) return

    if (mode === 'town') {
      const result = computeIDW(coords.xPct, coords.yPct, resourcePoints, terrainAreas, placedPoIs)
      setTownPanel({ xPct: coords.xPct, yPct: coords.yPct, result })
      return
    }

    if (mode === 'poi') {
      setPoiPanelOpen(true)
      return
    }
  }

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const containerDims = containerRef.current?.getBoundingClientRect()

  return (
    <div className="flex flex-col h-screen bg-[#111316] overflow-hidden">
      <div
        className="flex items-center gap-4 px-4 py-2.5 border-b border-[#282a2d] shrink-0 flex-wrap"
        style={{ background: 'rgba(14,16,19,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <Link
          href={`/dm/campaigns/${campaignId}/maps`}
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-manrope"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {campaignName}
        </Link>

        <div className="h-4 w-px bg-[#282a2d]" />

        <div className="flex items-center gap-1 flex-wrap">
          <ToolbarToggle
            active={showResources}
            onToggle={() => setShowResources(v => !v)}
            label="Resources"
            icon={showResources ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          />
          <ToolbarToggle
            active={showPois}
            onToggle={() => setShowPois(v => !v)}
            label="PoIs"
            icon={<MapPin className="w-3.5 h-3.5" />}
          />
          <ToolbarToggle
            active={showTowns}
            onToggle={() => setShowTowns(v => !v)}
            label="Towns"
            icon={<Castle className="w-3.5 h-3.5" />}
          />
        </div>

        <div className="h-4 w-px bg-[#282a2d]" />

        <div className="flex items-center gap-1">
          <ModeButton
            active={mode === 'town'}
            onClick={() => setMode(mode === 'town' ? 'view' : 'town')}
            label="Add Town"
            icon={<Castle className="w-3.5 h-3.5" />}
          />
          <ModeButton
            active={mode === 'poi'}
            onClick={() => { setMode(mode === 'poi' ? 'view' : 'poi'); if (mode !== 'poi') setPoiPanelOpen(true) }}
            label="Add PoI"
            icon={<MapPin className="w-3.5 h-3.5" />}
          />
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-1.5 ml-auto text-xs font-manrope text-primary animate-pulse">
            <Crosshair className="w-3.5 h-3.5" />
            {mode === 'town' ? 'Click map to place a town' : 'Click map to place a PoI'}
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleMapClick}
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
            {showResources && resourcePoints.map(rp => (
              <circle
                key={rp.id}
                cx={rp.x_pct}
                cy={rp.y_pct}
                r={0.006 + rp.richness * 0.003}
                fill={getResourceColor(rp.resource_type)}
                fillOpacity={0.85}
                stroke="white"
                strokeWidth={0.001}
              />
            ))}

            {showPois && pois.map(poi => {
              const def = POI_DEFINITIONS.find(d => d.type === poi.poi_type)
              const color = def?.mapColor ?? '#9e9e9e'
              return (
                <g key={poi.id}>
                  <circle
                    cx={poi.x_pct}
                    cy={poi.y_pct}
                    r={0.008}
                    fill={color}
                    stroke="white"
                    strokeWidth={0.0015}
                  />
                </g>
              )
            })}

            {showTowns && worldTowns.map(town => (
              <g key={town.id}>
                <circle
                  cx={town.x_pct}
                  cy={town.y_pct}
                  r={0.012}
                  fill="#ffc637"
                  stroke="#3f2e00"
                  strokeWidth={0.002}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Hover tooltip (desktop) */}
        {hoverPos && idwResult && containerDims && (
          <MapHoverTooltip
            x={hoverPos.x}
            y={hoverPos.y}
            idwResult={idwResult}
            terrainArea={hoveredTerrainArea as Parameters<typeof MapHoverTooltip>[0]['terrainArea']}
            containerWidth={containerDims.width}
            containerHeight={containerDims.height}
          />
        )}

        {/* PoI placement panel */}
        {poiPanelOpen && (
          <MapPoIPanel
            campaignId={campaignId}
            mapId={map.id}
            onClose={() => { setPoiPanelOpen(false); setMode('view') }}
            onPlaced={(newPoi: PlacedPoIResult) => {
              setPois(prev => [...prev, newPoi as PoI])
              setPoiPanelOpen(false)
              setMode('view')
            }}
          />
        )}

        {/* Town placement panel */}
        {townPanel && (
          <MapTownPanel
            campaignId={campaignId}
            mapId={map.id}
            xPct={townPanel.xPct}
            yPct={townPanel.yPct}
            idwResult={townPanel.result}
            resourcePoints={resourcePoints}
            onClose={() => { setTownPanel(null); setMode('view') }}
            onPlaced={(newTown: PlacedTownResult) => {
              setWorldTowns(prev => [...prev, newTown as WorldTown])
              setTownPanel(null)
              setMode('view')
            }}
          />
        )}
      </div>
    </div>
  )
}

function ToolbarToggle({ active, onToggle, label, icon }: {
  active: boolean; onToggle: () => void; label: string; icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-manrope transition-all ${
        active ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function ModeButton({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-manrope transition-all ${
        active
          ? 'bg-primary text-[#3f2e00] font-semibold'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
