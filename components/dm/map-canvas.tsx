'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Eye, EyeOff, MapPin, Castle, Crosshair, Shield, BookOpen, Route, Layers, Gem, Filter, ChevronDown, Type } from 'lucide-react'
import { computeIDW, type IDWResult, type ResourcePoint, type TerrainArea, type PlacedPoI } from '@/lib/world/resourceInterpolation'
import { MapHoverTooltip } from './map-hover-tooltip'
import { MapPoIPanel, type PlacedPoIResult } from './map-poi-panel'
import { MapTownPanel, type PlacedTownResult } from './map-town-panel'
import { MapTownCard } from './map-town-card'
import { MapTerritoryPanel, type PlacedTerritoryResult } from './map-territory-panel'
import { MapHistoricalEventPanel, type PlacedHistoricalEventResult } from './map-historical-event-panel'
import { MapMobileModal } from './map-mobile-modal'
import { MapTradeRoutePanel, type PlacedTradeRouteResult } from './map-trade-route-panel'
import { MapTerrainPainterPanel, type AddedTerrainArea } from './map-terrain-painter-panel'
import { MapResourcePlacerPanel, type AddedResourcePoint } from './map-resource-placer-panel'
import { POI_DEFINITIONS } from '@/lib/world/poiDefinitions'
import { MapPoIInfoCard } from './map-poi-info-card'
import { MapHistEventInfoCard } from './map-hist-event-info-card'
import { MapTerritoryInfoCard } from './map-territory-info-card'

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

const RESOURCE_GROUPS: Record<string, string[]> = {
  Minerals: ['iron_deposit','copper_deposit','gold_vein','silver_vein','gem_cluster','coal_seam','stone_quarry','salt_flat','sulfur_vent'],
  'Food & Water': ['fertile_farmland','grazing_land','orchard','deep_fishery','coastal_fishery','river_fishery'],
  Nature: ['ancient_forest','managed_woodland','rare_herbs'],
  Trade: ['natural_harbor','river_ford','mountain_pass','trade_crossroads','oasis','river_confluence'],
  Special: ['arcane_nexus','ancient_ruins','volcanic_soil','hot_springs'],
}

type Mode = 'view' | 'town' | 'poi' | 'territory' | 'history' | 'trade_route' | 'terrain' | 'resource'

const TERRAIN_FILL_COLORS: Record<string, string> = {
  ocean: '#1565c0', deep_sea: '#0d47a1', coast: '#42a5f5', river: '#29b6f6', lake: '#26c6da',
  plains: '#aed581', grassland: '#66bb6a', farmland: '#cddc39', wetlands: '#558b2f', swamp: '#4e342e',
  forest: '#388e3c', deep_forest: '#1b5e20', jungle: '#2e7d32',
  hills: '#a1887f', highlands: '#8d6e63', mountains: '#78909c', high_mountains: '#546e7a',
  desert: '#ffd54f', tundra: '#b0bec5', glacier: '#e0f7fa', volcano: '#e53935',
}

interface WorldTown {
  id: string
  x_pct: number
  y_pct: number
  name: string | null
  town_tier: string | null
  wealth_score: number | null
  specializations: string[] | null
  shop_id?: string | null
  poi_id?: string | null
  population_est?: number | null
}

interface Territory {
  id: string
  name: string
  faction: string | null
  color: string | null
  polygon: Array<{ x: number; y: number }>
  law_level: string | null
  attitude_to_strangers: string | null
}

interface TradeRoute {
  id: string
  town_a_id: string
  town_b_id: string
  primary_goods: string[] | null
  trade_volume: number | null
}

interface HistEvent {
  id: string
  x_pct: number
  y_pct: number
  event_name: string
  event_type: string | null
  years_ago: number | null
  is_known_to_players: boolean | null
}

interface PoI {
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
  territories: Territory[]
  historicalEvents: HistEvent[]
  tradeRoutes: TradeRoute[]
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
  territories: initialTerritories,
  historicalEvents: initialHistoricalEvents,
  tradeRoutes: initialTradeRoutes,
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
  const [territories, setTerritories] = useState(initialTerritories)
  const [historicalEvents, setHistoricalEvents] = useState(initialHistoricalEvents)
  const [tradeRoutes, setTradeRoutes] = useState(initialTradeRoutes)
  const [routeSourceTown, setRouteSourceTown] = useState<WorldTown | null>(null)
  const [routeTargetTown, setRouteTargetTown] = useState<WorldTown | null>(null)
  const [showTradeRoutes, setShowTradeRoutes] = useState(true)

  const [poiPanelOpen, setPoiPanelOpen] = useState(false)
  const [selectedPoi, setSelectedPoi] = useState<PoI | null>(null)
  const [selectedPoiPos, setSelectedPoiPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedHistEvent, setSelectedHistEvent] = useState<HistEvent | null>(null)
  const [selectedHistEventPos, setSelectedHistEventPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)
  const [selectedTerritoryPos, setSelectedTerritoryPos] = useState<{ x: number; y: number } | null>(null)
  const [townPanel, setTownPanel] = useState<{ xPct: number; yPct: number; result: IDWResult } | null>(null)
  const [selectedTown, setSelectedTown] = useState<WorldTown | null>(null)
  const [selectedTownPos, setSelectedTownPos] = useState<{ x: number; y: number } | null>(null)
  const [histEventPos, setHistEventPos] = useState<{ xPct: number; yPct: number } | null>(null)
  const [drawingPolygon, setDrawingPolygon] = useState<Array<{ x: number; y: number }>>([])  
  const [territoryFormPolygon, setTerritoryFormPolygon] = useState<Array<{ x: number; y: number }> | null>(null)
  const [showTerritories, setShowTerritories] = useState(true)
  const [showHistory, setShowHistory] = useState(true)
  const [showTerrainAreas, setShowTerrainAreas] = useState(false)
  const [showNames, setShowNames] = useState(false)
  const [mutableTerrainAreas, setMutableTerrainAreas] = useState(terrainAreas)
  const [drawingTerrainType, setDrawingTerrainType] = useState('forest')
  const [terrainFormPolygon, setTerrainFormPolygon] = useState<Array<{ x: number; y: number }> | null>(null)
  const [resourcePanelOpen, setResourcePanelOpen] = useState(false)
  const [resourceClickPos, setResourceClickPos] = useState<{ xPct: number; yPct: number } | null>(null)
  const [mobileModal, setMobileModal] = useState<{ result: IDWResult; terrainType: string | null } | null>(null)
  const [hiddenResourceTypes, setHiddenResourceTypes] = useState<Set<string>>(new Set())
  const [showResourceFilter, setShowResourceFilter] = useState(false)
  const [hiddenPoiCategories, setHiddenPoiCategories] = useState<Set<string>>(new Set())
  const [showPoiFilter, setShowPoiFilter] = useState(false)
  const [hiddenTerrainTypes, setHiddenTerrainTypes] = useState<Set<string>>(new Set())
  const [showTerrainFilter, setShowTerrainFilter] = useState(false)

  const placedPoIs = useMemo<PlacedPoI[]>(() =>
    pois.map(p => ({ id: p.id, x_pct: p.x_pct, y_pct: p.y_pct, poi_type: p.poi_type })),
    [pois]
  )

  const hoveredTerrainArea = useMemo(() => {
    if (!idwResult) return null
    return mutableTerrainAreas.find(a => a.terrain_type === idwResult.dominantTerrain) ?? null
  }, [idwResult, mutableTerrainAreas])

  const presentTerrainTypes = useMemo(
    () => Array.from(new Set(mutableTerrainAreas.map(a => a.terrain_type))).sort(),
    [mutableTerrainAreas]
  )

  const POI_CATEGORIES: { id: string; label: string; color: string }[] = [
    { id: 'settlement', label: 'Settlements', color: '#7c6a4e' },
    { id: 'military',   label: 'Military',    color: '#5a7a9e' },
    { id: 'arcane',     label: 'Arcane',      color: '#7a5e9e' },
    { id: 'dungeon',    label: 'Dungeons',    color: '#9e5e5e' },
    { id: 'wilderness', label: 'Wilderness',  color: '#5e8e5e' },
    { id: 'divine',     label: 'Divine',      color: '#c8a84b' },
    { id: 'trade',      label: 'Trade',       color: '#8e7a4e' },
    { id: 'lore',       label: 'Lore',        color: '#6e8a9e' },
  ]

  function getCanvasCoords(e: React.MouseEvent): { x: number; y: number; xPct: number; yPct: number; inBounds: boolean } | null {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Use SVG coordinate transform so clicks align with the SVG overlay even when the
    // map image uses object-contain (which letterboxes the image inside the container).
    // Without this, clicks in the letterbox margin are offset from where dots appear.
    const svgEl = el.querySelector('svg') as SVGSVGElement | null
    if (svgEl?.getScreenCTM) {
      const ctm = svgEl.getScreenCTM()
      if (ctm) {
        const pt = svgEl.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgPt = pt.matrixTransform(ctm.inverse())
        const inBounds = svgPt.x >= 0 && svgPt.x <= 1 && svgPt.y >= 0 && svgPt.y <= 1
        return { x, y, xPct: Math.max(0, Math.min(1, svgPt.x)), yPct: Math.max(0, Math.min(1, svgPt.y)), inBounds }
      }
    }
    return { x, y, xPct: x / rect.width, yPct: y / rect.height, inBounds: true }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastMoveRef.current < THROTTLE_MS) return
    lastMoveRef.current = now

    const coords = getCanvasCoords(e)
    if (!coords) return
    if (!coords.inBounds) {
      setHoverPos(null)
      setIdwResult(null)
      return
    }
    setHoverPos(coords)

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const result = computeIDW(coords.xPct, coords.yPct, resourcePoints, mutableTerrainAreas, placedPoIs)
      setIdwResult(result)
    })
  }, [resourcePoints, mutableTerrainAreas, placedPoIs])

  function handleMouseLeave() {
    setHoverPos(null)
    setIdwResult(null)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const touch = e.changedTouches[0]
    if (!touch || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    let xPct = (touch.clientX - rect.left) / rect.width
    let yPct = (touch.clientY - rect.top) / rect.height
    const svgEl = containerRef.current.querySelector('svg') as SVGSVGElement | null
    if (svgEl?.getScreenCTM) {
      const ctm = svgEl.getScreenCTM()
      if (ctm) {
        const pt = svgEl.createSVGPoint()
        pt.x = touch.clientX; pt.y = touch.clientY
        const svgPt = pt.matrixTransform(ctm.inverse())
        xPct = Math.max(0, Math.min(1, svgPt.x))
        yPct = Math.max(0, Math.min(1, svgPt.y))
      }
    }
    const result = computeIDW(xPct, yPct, resourcePoints, mutableTerrainAreas, placedPoIs)
    const terrain = mutableTerrainAreas.find(a => a.terrain_type === result.dominantTerrain)
    setMobileModal({ result, terrainType: terrain?.terrain_type ?? null })
  }

  function handleMapClick(e: React.MouseEvent) {
    const coords = getCanvasCoords(e)
    if (!coords) return

    if (mode === 'territory' || mode === 'terrain') {
      setDrawingPolygon(prev => [...prev, { x: coords.xPct, y: coords.yPct }])
      return
    }

    if (mode === 'resource') {
      setResourceClickPos({ xPct: coords.xPct, yPct: coords.yPct })
      return
    }

    if (mode === 'history') {
      setHistEventPos({ xPct: coords.xPct, yPct: coords.yPct })
      return
    }

    if (mode === 'town') {
      const result = computeIDW(coords.xPct, coords.yPct, resourcePoints, mutableTerrainAreas, placedPoIs)
      setTownPanel({ xPct: coords.xPct, yPct: coords.yPct, result })
      return
    }

    if (mode === 'poi') {
      setPoiPanelOpen(true)
      return
    }

    setSelectedTown(null)
    setSelectedTownPos(null)
    setSelectedPoi(null)
    setSelectedPoiPos(null)
    setSelectedHistEvent(null)
    setSelectedHistEventPos(null)
    setSelectedTerritory(null)
    setSelectedTerritoryPos(null)
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (mode === 'territory' && drawingPolygon.length >= 3) {
      e.preventDefault()
      setTerritoryFormPolygon(drawingPolygon)
      setDrawingPolygon([])
    }
    if (mode === 'terrain' && drawingPolygon.length >= 3) {
      e.preventDefault()
      setTerrainFormPolygon(drawingPolygon)
      setDrawingPolygon([])
    }
  }

  function handleTownPinClick(e: React.MouseEvent, town: WorldTown) {
    e.stopPropagation()
    if (mode === 'trade_route') {
      if (!routeSourceTown) {
        setRouteSourceTown(town)
        return
      }
      if (routeSourceTown.id === town.id) return
      setRouteTargetTown(town)
      return
    }
    if (mode !== 'view') return
    const coords = getCanvasCoords(e)
    setSelectedTown(town)
    setSelectedTownPos(coords ? { x: coords.x, y: coords.y } : null)
  }

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const containerDims = containerRef.current?.getBoundingClientRect()

  return (
    <div className="flex h-screen bg-[#111316] overflow-hidden">

      {/* ── Left sidebar (desktop) ────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-52 shrink-0 border-r border-[#282a2d] overflow-y-auto"
        style={{ background: 'rgba(11,12,16,0.98)' }}
      >
        <div className="px-3 py-3 border-b border-[#282a2d]">
          <Link
            href={`/dm/campaigns/${campaignId}/maps`}
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-manrope"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {campaignName}
          </Link>
        </div>

        <div className="px-2 pt-3 pb-2 border-b border-[#282a2d]">
          <p className="px-1 mb-1.5 text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-manrope">Show</p>
          <SidebarToggle active={showResources} onToggle={() => setShowResources(v => !v)} label="Resources" icon={showResources ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} />
          {showResources && (
            <div className="ml-3 mt-0.5 mb-0.5">
              <button
                type="button"
                onClick={() => setShowResourceFilter(v => !v)}
                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-primary transition-colors py-0.5"
              >
                <Filter className="w-2.5 h-2.5" />
                Filter types
                <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showResourceFilter ? 'rotate-180' : ''}`} />
              </button>
              {showResourceFilter && (
                <div className="mt-1.5 space-y-2 pr-1 max-h-64 overflow-y-auto">
                  <div className="flex gap-2 mb-1">
                    <button type="button" onClick={() => setHiddenResourceTypes(new Set())} className="text-[9px] text-primary hover:underline">All</button>
                    <button type="button" onClick={() => setHiddenResourceTypes(new Set(Object.values(RESOURCE_GROUPS).flat()))} className="text-[9px] text-on-surface-variant hover:text-primary hover:underline">None</button>
                  </div>
                  {Object.entries(RESOURCE_GROUPS).map(([group, types]) => (
                    <div key={group}>
                      <p className="text-[9px] uppercase tracking-widest text-on-surface-variant/40 mb-1">{group}</p>
                      <div className="space-y-0.5">
                        {types.map(rt => (
                          <label key={rt} className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={!hiddenResourceTypes.has(rt)}
                              onChange={() => {
                                setHiddenResourceTypes(prev => {
                                  const next = new Set(prev)
                                  if (next.has(rt)) next.delete(rt); else next.add(rt)
                                  return next
                                })
                              }}
                              className="accent-primary w-2.5 h-2.5 shrink-0"
                            />
                            <span className="text-[10px] text-on-surface-variant group-hover:text-on-surface capitalize truncate">
                              {rt.replace(/_/g, ' ')}
                            </span>
                            <span className="w-2 h-2 rounded-full shrink-0 ml-auto" style={{ background: getResourceColor(rt) }} />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <SidebarToggle active={showPois} onToggle={() => setShowPois(v => !v)} label="PoIs" icon={<MapPin className="w-3.5 h-3.5" />} />
          {showPois && (
            <div className="ml-3 mt-0.5 mb-0.5">
              <button
                type="button"
                onClick={() => setShowPoiFilter(v => !v)}
                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-primary transition-colors py-0.5"
              >
                <Filter className="w-2.5 h-2.5" />
                Filter types
                <span className="ml-auto text-[9px] opacity-50">{showPoiFilter ? '▲' : '▼'}</span>
              </button>
              {showPoiFilter && (
                <div className="mt-1 space-y-0.5 pr-1">
                  <div className="flex gap-2 mb-1">
                    <button type="button" onClick={() => setHiddenPoiCategories(new Set())} className="text-[9px] text-primary hover:underline">All</button>
                    <button type="button" onClick={() => setHiddenPoiCategories(new Set(POI_CATEGORIES.map(c => c.id)))} className="text-[9px] text-on-surface-variant hover:text-primary hover:underline">None</button>
                  </div>
                  {POI_CATEGORIES.map(cat => (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!hiddenPoiCategories.has(cat.id)}
                        onChange={() => {
                          setHiddenPoiCategories(prev => {
                            const next = new Set(prev)
                            if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id)
                            return next
                          })
                        }}
                        className="accent-primary w-2.5 h-2.5 shrink-0"
                      />
                      <span className="text-[10px] text-on-surface-variant group-hover:text-on-surface capitalize truncate">
                        {cat.label}
                      </span>
                      <span className="w-2 h-2 rounded-full shrink-0 ml-auto" style={{ background: cat.color }} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <SidebarToggle active={showTowns} onToggle={() => setShowTowns(v => !v)} label="Towns" icon={<Castle className="w-3.5 h-3.5" />} />
          <SidebarToggle active={showTerritories} onToggle={() => setShowTerritories(v => !v)} label="Territories" icon={<Shield className="w-3.5 h-3.5" />} />
          <SidebarToggle active={showHistory} onToggle={() => setShowHistory(v => !v)} label="History" icon={<BookOpen className="w-3.5 h-3.5" />} />
          <SidebarToggle active={showTradeRoutes} onToggle={() => setShowTradeRoutes(v => !v)} label="Routes" icon={<Route className="w-3.5 h-3.5" />} />
          <SidebarToggle active={showTerrainAreas} onToggle={() => setShowTerrainAreas(v => !v)} label="Terrain" icon={<Layers className="w-3.5 h-3.5" />} />
          {showTerrainAreas && presentTerrainTypes.length > 0 && (
            <div className="ml-3 mt-0.5 mb-0.5">
              <button
                type="button"
                onClick={() => setShowTerrainFilter(v => !v)}
                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-primary transition-colors py-0.5"
              >
                <Filter className="w-2.5 h-2.5" />
                Filter types
                <span className="ml-auto text-[9px] opacity-50">{showTerrainFilter ? '▲' : '▼'}</span>
              </button>
              {showTerrainFilter && (
                <div className="mt-1 space-y-0.5 pr-1 max-h-48 overflow-y-auto">
                  <div className="flex gap-2 mb-1">
                    <button type="button" onClick={() => setHiddenTerrainTypes(new Set())} className="text-[9px] text-primary hover:underline">All</button>
                    <button type="button" onClick={() => setHiddenTerrainTypes(new Set(presentTerrainTypes))} className="text-[9px] text-on-surface-variant hover:text-primary hover:underline">None</button>
                  </div>
                  {presentTerrainTypes.map(tt => (
                    <label key={tt} className="flex items-center gap-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!hiddenTerrainTypes.has(tt)}
                        onChange={() => {
                          setHiddenTerrainTypes(prev => {
                            const next = new Set(prev)
                            if (next.has(tt)) next.delete(tt); else next.add(tt)
                            return next
                          })
                        }}
                        className="accent-primary w-2.5 h-2.5 shrink-0"
                      />
                      <span className="text-[10px] text-on-surface-variant group-hover:text-on-surface capitalize truncate">
                        {tt.replace(/_/g, ' ')}
                      </span>
                      <span className="w-2 h-2 rounded-full shrink-0 ml-auto" style={{ background: TERRAIN_FILL_COLORS[tt] ?? '#9e9e9e' }} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <SidebarToggle active={showNames} onToggle={() => setShowNames(v => !v)} label="Names" icon={<Type className="w-3.5 h-3.5" />} />
        </div>

        <div className="px-2 pt-3 pb-3">
          <p className="px-1 mb-1.5 text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-manrope">Add</p>
          <SidebarModeButton active={mode === 'town'} onClick={() => setMode(mode === 'town' ? 'view' : 'town')} label="Town" icon={<Castle className="w-3.5 h-3.5" />} />
          <SidebarModeButton active={mode === 'poi'} onClick={() => { setMode(mode === 'poi' ? 'view' : 'poi'); if (mode !== 'poi') setPoiPanelOpen(true) }} label="Point of Interest" icon={<MapPin className="w-3.5 h-3.5" />} />
          <SidebarModeButton active={mode === 'territory'} onClick={() => { setMode(mode === 'territory' ? 'view' : 'territory'); setDrawingPolygon([]) }} label="Territory" icon={<Shield className="w-3.5 h-3.5" />} />
          <SidebarModeButton active={mode === 'history'} onClick={() => setMode(mode === 'history' ? 'view' : 'history')} label="Historical Event" icon={<BookOpen className="w-3.5 h-3.5" />} />
          <SidebarModeButton active={mode === 'trade_route'} onClick={() => { setMode(mode === 'trade_route' ? 'view' : 'trade_route'); setRouteSourceTown(null); setRouteTargetTown(null) }} label="Trade Route" icon={<Route className="w-3.5 h-3.5" />} />
          <SidebarModeButton active={mode === 'terrain'} onClick={() => { setMode(mode === 'terrain' ? 'view' : 'terrain'); setDrawingPolygon([]) }} label="Paint Terrain" icon={<Layers className="w-3.5 h-3.5" />} />
          <SidebarModeButton active={mode === 'resource'} onClick={() => { setMode(mode === 'resource' ? 'view' : 'resource'); setResourcePanelOpen(true) }} label="Place Resource" icon={<Gem className="w-3.5 h-3.5" />} />
        </div>

        {mode !== 'view' && (
          <div className="px-3 py-3 mt-auto border-t border-[#282a2d] flex items-start gap-2 text-xs font-manrope text-primary">
            <Crosshair className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-pulse" />
            <span className="leading-relaxed">
              {mode === 'town' && 'Click map to place a town'}
              {mode === 'poi' && 'Click map to place a PoI'}
              {mode === 'territory' && (drawingPolygon.length < 3 ? `Drawing… (${drawingPolygon.length} pts, need 3+)` : `${drawingPolygon.length} pts · double-click to finish`)}
              {mode === 'history' && 'Click map to record a historical event'}
              {mode === 'trade_route' && (!routeSourceTown ? 'Click a town pin to start' : `From: ${routeSourceTown.name ?? 'Town'} — click another town`)}
              {mode === 'terrain' && (drawingPolygon.length < 3 ? `Painting ${drawingTerrainType.replace(/_/g,' ')} — click to add points` : `${drawingPolygon.length} pts · double-click to close`)}
              {mode === 'resource' && 'Click map to place a resource'}
            </span>
          </div>
        )}
      </aside>

      {/* ── Right column ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile strip */}
        <div
          className="md:hidden flex items-center gap-1 px-3 py-2 border-b border-[#282a2d] shrink-0 overflow-x-auto"
          style={{ background: 'rgba(14,16,19,0.95)' }}
        >
          <Link href={`/dm/campaigns/${campaignId}/maps`} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors font-manrope shrink-0 mr-1">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
          <ToolbarToggle active={showResources} onToggle={() => setShowResources(v => !v)} label="Res" icon={showResources ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} />
          <ToolbarToggle active={showPois} onToggle={() => setShowPois(v => !v)} label="PoIs" icon={<MapPin className="w-3.5 h-3.5" />} />
          <ToolbarToggle active={showTowns} onToggle={() => setShowTowns(v => !v)} label="Towns" icon={<Castle className="w-3.5 h-3.5" />} />
          <ToolbarToggle active={showNames} onToggle={() => setShowNames(v => !v)} label="Names" icon={<Type className="w-3.5 h-3.5" />} />
          <div className="w-px h-4 bg-[#282a2d] mx-0.5 shrink-0" />
          <ModeButton active={mode === 'town'} onClick={() => setMode(mode === 'town' ? 'view' : 'town')} label="Town" icon={<Castle className="w-3.5 h-3.5" />} />
          <ModeButton active={mode === 'poi'} onClick={() => { setMode(mode === 'poi' ? 'view' : 'poi'); if (mode !== 'poi') setPoiPanelOpen(true) }} label="PoI" icon={<MapPin className="w-3.5 h-3.5" />} />
          <ModeButton active={mode === 'territory'} onClick={() => { setMode(mode === 'territory' ? 'view' : 'territory'); setDrawingPolygon([]) }} label="Territory" icon={<Shield className="w-3.5 h-3.5" />} />
          <ModeButton active={mode === 'terrain'} onClick={() => { setMode(mode === 'terrain' ? 'view' : 'terrain'); setDrawingPolygon([]) }} label="Terrain" icon={<Layers className="w-3.5 h-3.5" />} />
          <ModeButton active={mode === 'resource'} onClick={() => { setMode(mode === 'resource' ? 'view' : 'resource'); setResourcePanelOpen(true) }} label="Resource" icon={<Gem className="w-3.5 h-3.5" />} />
          {mode !== 'view' && (
            <span className="ml-auto shrink-0 text-[11px] text-primary animate-pulse font-manrope whitespace-nowrap">
              <Crosshair className="w-3 h-3 inline mr-1" />
              {mode === 'town' && 'Tap to place'}
              {mode === 'poi' && 'Tap to place'}
              {mode === 'territory' && `${drawingPolygon.length} pts`}
              {mode === 'terrain' && `${drawingPolygon.length} pts`}
              {mode === 'resource' && 'Tap to place'}
            </span>
          )}
        </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleMapClick}
          onDoubleClick={handleDoubleClick}
          onTouchEnd={handleTouchEnd}
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
            <defs>
              <filter id="label-shadow" x="-20%" y="-40%" width="140%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="0.004" floodColor="#000000" floodOpacity="0.9" />
                <feDropShadow dx="0" dy="0" stdDeviation="0.002" floodColor="#000000" floodOpacity="0.7" />
              </filter>
            </defs>
            {showResources && resourcePoints.filter(rp => !hiddenResourceTypes.has(rp.resource_type)).map(rp => (
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

            {showPois && pois.filter(poi => {
              const def = POI_DEFINITIONS.find(d => d.type === poi.poi_type)
              return !def || !hiddenPoiCategories.has(def.category)
            }).map(poi => {
              const def = POI_DEFINITIONS.find(d => d.type === poi.poi_type)
              const color = def?.mapColor ?? '#9e9e9e'
              const isSelected = selectedPoi?.id === poi.id
              return (
                <g
                  key={poi.id}
                  style={{ pointerEvents: mode === 'view' ? 'all' : 'none', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode !== 'view') return
                    const coords = getCanvasCoords(e as unknown as React.MouseEvent)
                    setSelectedTown(null)
                    setSelectedTownPos(null)
                    setSelectedPoi(poi)
                    setSelectedPoiPos(coords ? { x: coords.x, y: coords.y } : null)
                  }}
                >
                  {isSelected && (
                    <circle cx={poi.x_pct} cy={poi.y_pct} r={0.013} fill="none" stroke="white" strokeWidth={0.002} strokeOpacity={0.6} />
                  )}
                  <circle
                    cx={poi.x_pct}
                    cy={poi.y_pct}
                    r={0.008}
                    fill={color}
                    stroke="white"
                    strokeWidth={0.0015}
                    fillOpacity={poi.is_discovered ? 1 : 0.55}
                  />
                </g>
              )
            })}

            {/* Terrain area outlines */}
            {showTerrainAreas && mutableTerrainAreas.filter(a => !hiddenTerrainTypes.has(a.terrain_type)).map((a, i) => {
              const col = TERRAIN_FILL_COLORS[a.terrain_type] ?? '#9e9e9e'
              return (
                <polygon
                  key={a.id ?? `ta-${i}`}
                  points={a.polygon.map((p: {x:number;y:number}) => `${p.x},${p.y}`).join(' ')}
                  fill={col}
                  fillOpacity={0.25}
                  stroke={col}
                  strokeWidth={0.002}
                  strokeOpacity={0.6}
                />
              )
            })}

            {/* Trade route bezier curves */}
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
                <g key={route.id}>
                  <path
                    d={`M ${a.x_pct} ${a.y_pct} Q ${cx} ${cy} ${b.x_pct} ${b.y_pct}`}
                    fill="none"
                    stroke="#ffc637"
                    strokeWidth={strokeW}
                    strokeOpacity={0.6}
                    strokeDasharray={`${strokeW * 4} ${strokeW * 2}`}
                  />
                </g>
              )
            })}

            {/* Territory polygons */}
            {showTerritories && territories.map(t => (
              <g
                key={t.id}
                style={{ pointerEvents: mode === 'view' ? 'all' : 'none', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (mode !== 'view') return
                  const coords = getCanvasCoords(e as unknown as React.MouseEvent)
                  setSelectedTown(null); setSelectedTownPos(null)
                  setSelectedPoi(null); setSelectedPoiPos(null)
                  setSelectedHistEvent(null); setSelectedHistEventPos(null)
                  setSelectedTerritory(t)
                  setSelectedTerritoryPos(coords ? { x: coords.x, y: coords.y } : null)
                }}
              >
                <polygon
                  points={t.polygon.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={t.color ?? '#3b82f6'}
                  fillOpacity={selectedTerritory?.id === t.id ? 0.28 : 0.18}
                  stroke={t.color ?? '#3b82f6'}
                  strokeWidth={selectedTerritory?.id === t.id ? 0.004 : 0.003}
                  strokeOpacity={0.7}
                />
                {t.polygon.length > 0 && (
                  <text
                    x={t.polygon.reduce((s, p) => s + p.x, 0) / t.polygon.length}
                    y={t.polygon.reduce((s, p) => s + p.y, 0) / t.polygon.length}
                    fontSize={0.018}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none' }}
                    opacity={0.9}
                  >
                    {t.name}
                  </text>
                )}
              </g>
            ))}

            {/* Terrain painting preview */}
            {mode === 'terrain' && drawingPolygon.length > 0 && (
              <>
                <polygon
                  points={drawingPolygon.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={TERRAIN_FILL_COLORS[drawingTerrainType] ?? '#9e9e9e'}
                  fillOpacity={0.2}
                  stroke={TERRAIN_FILL_COLORS[drawingTerrainType] ?? '#9e9e9e'}
                  strokeWidth={0.002}
                  strokeDasharray="0.006 0.003"
                />
                {drawingPolygon.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={0.004} fill={TERRAIN_FILL_COLORS[drawingTerrainType] ?? '#9e9e9e'} stroke="white" strokeWidth={0.001} />
                ))}
              </>
            )}

            {/* Territory drawing preview */}
            {mode === 'territory' && drawingPolygon.length > 0 && (
              <g>
                <polyline
                  points={drawingPolygon.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={0.003}
                  strokeDasharray="0.015 0.007"
                />
                {hoverPos && (
                  <line
                    x1={drawingPolygon[drawingPolygon.length - 1].x}
                    y1={drawingPolygon[drawingPolygon.length - 1].y}
                    x2={hoverPos.xPct}
                    y2={hoverPos.yPct}
                    stroke="#3b82f6"
                    strokeWidth={0.002}
                    strokeDasharray="0.008 0.005"
                    opacity={0.5}
                  />
                )}
                {drawingPolygon.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={0.005} fill="#3b82f6" opacity={0.9} />
                ))}
              </g>
            )}

            {/* Historical event markers */}
            {showHistory && historicalEvents.map(ev => {
              const isSelected = selectedHistEvent?.id === ev.id
              const isKnown = ev.is_known_to_players
              return (
                <g
                  key={ev.id}
                  style={{ pointerEvents: mode === 'view' ? 'all' : 'none', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode !== 'view') return
                    const coords = getCanvasCoords(e as unknown as React.MouseEvent)
                    setSelectedTown(null); setSelectedTownPos(null)
                    setSelectedPoi(null); setSelectedPoiPos(null)
                    setSelectedTerritory(null); setSelectedTerritoryPos(null)
                    setSelectedHistEvent(ev)
                    setSelectedHistEventPos(coords ? { x: coords.x, y: coords.y } : null)
                  }}
                >
                  {isSelected && (
                    <circle cx={ev.x_pct} cy={ev.y_pct} r={0.014} fill="none" stroke="#f59e0b" strokeWidth={0.002} strokeOpacity={0.5} />
                  )}
                  <circle cx={ev.x_pct} cy={ev.y_pct} r={0.009} fill={isKnown ? '#f59e0b' : '#92400e'} stroke="#78350f" strokeWidth={0.002} />
                  <text
                    x={ev.x_pct}
                    y={ev.y_pct}
                    fontSize={0.010}
                    fill={isKnown ? '#78350f' : '#fde68a'}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    !
                  </text>
                </g>
              )
            })}

            {showTowns && worldTowns.map(town => {
              const isRouteSource = routeSourceTown?.id === town.id
              return (
              <g
                key={town.id}
                style={{ pointerEvents: 'all', cursor: mode === 'view' || mode === 'trade_route' ? 'pointer' : 'default' }}
                onClick={(e) => handleTownPinClick(e as unknown as React.MouseEvent, town)}
              >
                {isRouteSource && (
                  <circle cx={town.x_pct} cy={town.y_pct} r={0.02} fill="none" stroke="#ffc637" strokeWidth={0.003} strokeOpacity={0.8} />
                )}
                <circle
                  cx={town.x_pct}
                  cy={town.y_pct}
                  r={0.014}
                  fill={isRouteSource ? '#ffe066' : '#ffc637'}
                  stroke="#3f2e00"
                  strokeWidth={0.002}
                />
                <text
                  x={town.x_pct}
                  y={town.y_pct}
                  fontSize={0.010}
                  fill="#3f2e00"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {(town.town_tier ?? 'hamlet').charAt(0).toUpperCase()}
                </text>
              </g>
            )})}

            {/* Name labels */}
            {showNames && showTowns && worldTowns.map(town => town.name ? (
              <text key={`nl-t-${town.id}`} x={town.x_pct} y={town.y_pct + 0.022} fontSize={0.012} fill="#ffffff" textAnchor="middle" dominantBaseline="hanging" style={{ pointerEvents: 'none', fontFamily: 'Manrope, sans-serif', fontWeight: 600 }} filter="url(#label-shadow)" opacity={0.95}>
                {town.name}
              </text>
            ) : null)}
            {showNames && showPois && pois.map(poi => poi.name ? (
              <text key={`nl-p-${poi.id}`} x={poi.x_pct} y={poi.y_pct + 0.013} fontSize={0.010} fill="#e8e8e8" textAnchor="middle" dominantBaseline="hanging" style={{ pointerEvents: 'none', fontFamily: 'Manrope, sans-serif', fontWeight: 500 }} filter="url(#label-shadow)" opacity={0.90}>
                {poi.name}
              </text>
            ) : null)}
            {showNames && showHistory && historicalEvents.map(ev => (
              <text key={`nl-h-${ev.id}`} x={ev.x_pct} y={ev.y_pct + 0.015} fontSize={0.010} fill="#fde68a" textAnchor="middle" dominantBaseline="hanging" style={{ pointerEvents: 'none', fontFamily: 'Manrope, sans-serif', fontWeight: 500 }} filter="url(#label-shadow)" opacity={0.90}>
                {ev.event_name}
              </text>
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

        {/* PoI info card */}
        {selectedPoi && selectedPoiPos && containerDims && (
          <MapPoIInfoCard
            poi={selectedPoi}
            mapId={map.id}
            x={selectedPoiPos.x}
            y={selectedPoiPos.y}
            containerWidth={containerDims.width}
            containerHeight={containerDims.height}
            onClose={() => { setSelectedPoi(null); setSelectedPoiPos(null) }}
            onUpdated={(poiId, patch) => {
              setPois(prev => prev.map(p => p.id === poiId ? { ...p, ...patch } : p))
            }}
            onDeleted={(id) => {
              setPois(prev => prev.filter(p => p.id !== id))
              setSelectedPoi(null); setSelectedPoiPos(null)
            }}
          />
        )}

        {/* Historical event info card */}
        {selectedHistEvent && selectedHistEventPos && containerDims && (
          <MapHistEventInfoCard
            event={selectedHistEvent}
            mapId={map.id}
            x={selectedHistEventPos.x}
            y={selectedHistEventPos.y}
            containerWidth={containerDims.width}
            containerHeight={containerDims.height}
            onClose={() => { setSelectedHistEvent(null); setSelectedHistEventPos(null) }}
            onUpdated={(eventId, patch) => {
              setHistoricalEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...patch } : e))
            }}
            onDeleted={(id) => {
              setHistoricalEvents(prev => prev.filter(e => e.id !== id))
              setSelectedHistEvent(null); setSelectedHistEventPos(null)
            }}
          />
        )}

        {/* Territory info card */}
        {selectedTerritory && selectedTerritoryPos && containerDims && (
          <MapTerritoryInfoCard
            territory={selectedTerritory}
            mapId={map.id}
            x={selectedTerritoryPos.x}
            y={selectedTerritoryPos.y}
            containerWidth={containerDims.width}
            containerHeight={containerDims.height}
            onClose={() => { setSelectedTerritory(null); setSelectedTerritoryPos(null) }}
            onDeleted={(id) => {
              setTerritories(prev => prev.filter(t => t.id !== id))
              setSelectedTerritory(null); setSelectedTerritoryPos(null)
            }}
          />
        )}

        {/* Town info card (click existing pin) */}
        {selectedTown && selectedTownPos && containerDims && (
          <MapTownCard
            town={selectedTown}
            campaignId={campaignId}
            mapId={map.id}
            x={selectedTownPos.x}
            y={selectedTownPos.y}
            containerWidth={containerDims.width}
            containerHeight={containerDims.height}
            onClose={() => { setSelectedTown(null); setSelectedTownPos(null) }}
            onDeleted={(id) => {
              setWorldTowns(prev => prev.filter(t => t.id !== id))
              setSelectedTown(null); setSelectedTownPos(null)
            }}
          />
        )}

        {/* Territory form panel */}
        {territoryFormPolygon && (
          <MapTerritoryPanel
            campaignId={campaignId}
            mapId={map.id}
            polygon={territoryFormPolygon}
            onClose={() => { setTerritoryFormPolygon(null); setMode('view') }}
            onPlaced={(t: PlacedTerritoryResult) => {
              setTerritories(prev => [...prev, t as Territory])
              setTerritoryFormPolygon(null)
              setMode('view')
            }}
          />
        )}

        {/* Terrain painter panel */}
        {mode === 'terrain' && (
          <MapTerrainPainterPanel
            campaignId={campaignId}
            mapId={map.id}
            polygon={terrainFormPolygon}
            drawingPointCount={drawingPolygon.length}
            selectedType={drawingTerrainType}
            onSelectType={setDrawingTerrainType}
            onClose={() => { setMode('view'); setDrawingPolygon([]); setTerrainFormPolygon(null) }}
            onSaved={(area: AddedTerrainArea) => {
              setMutableTerrainAreas(prev => [...prev, {
                ...area,
                polygon: area.polygon,
                hazards: null,
                computed_elevation_m: area.computed_elevation_m ?? null,
                climate_zone: area.climate_zone ?? null,
                temp_summer_high_c: null,
                temp_winter_low_c: null,
                annual_rainfall_mm: null,
                ecosystem_flora: null,
                ecosystem_fauna: null,
                atmosphere_text: area.atmosphere_text ?? null,
              }])
              setTerrainFormPolygon(null)
              setShowTerrainAreas(true)
            }}
            onClearPolygon={() => { setDrawingPolygon([]); setTerrainFormPolygon(null) }}
          />
        )}

        {/* Resource placer panel */}
        {(mode === 'resource' || resourcePanelOpen) && (
          <MapResourcePlacerPanel
            campaignId={campaignId}
            mapId={map.id}
            clickPos={mode === 'resource' ? resourceClickPos : null}
            onClose={() => { setMode('view'); setResourcePanelOpen(false); setResourceClickPos(null) }}
            onPlaced={(rp: AddedResourcePoint) => {
              setResourcePoints(prev => [...prev, {
                id: rp.id,
                x_pct: rp.x_pct,
                y_pct: rp.y_pct,
                resource_type: rp.resource_type,
                richness: rp.richness,
                influence_radius_pct: rp.influence_radius_pct,
                name: rp.name,
                placed_by: 'manual',
              }])
            }}
          />
        )}

        {/* Trade route panel */}
        {routeSourceTown && routeTargetTown && (
          <MapTradeRoutePanel
            campaignId={campaignId}
            mapId={map.id}
            townA={routeSourceTown}
            townB={routeTargetTown}
            onClose={() => { setRouteSourceTown(null); setRouteTargetTown(null); setMode('view') }}
            onPlaced={(r: PlacedTradeRouteResult) => {
              setTradeRoutes(prev => [...prev, r as TradeRoute])
              setRouteSourceTown(null)
              setRouteTargetTown(null)
              setMode('view')
            }}
          />
        )}

        {/* Mobile resource modal */}
        {mobileModal && (
          <MapMobileModal
            idwResult={mobileModal.result}
            terrainType={mobileModal.terrainType}
            onClose={() => setMobileModal(null)}
          />
        )}

        {/* Historical event panel */}
        {histEventPos && (
          <MapHistoricalEventPanel
            campaignId={campaignId}
            mapId={map.id}
            xPct={histEventPos.xPct}
            yPct={histEventPos.yPct}
            onClose={() => { setHistEventPos(null) }}
            onPlaced={(ev: PlacedHistoricalEventResult) => {
              setHistoricalEvents(prev => [...prev, ev as HistEvent])
              setHistEventPos(null)
              setMode('view')
            }}
          />
        )}
      </div>
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

function SidebarToggle({ active, onToggle, label, icon }: {
  active: boolean; onToggle: () => void; label: string; icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-manrope transition-all ${
        active ? 'bg-primary/12 text-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#1e2024]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SidebarModeButton({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-manrope transition-all ${
        active
          ? 'bg-primary text-[#3f2e00] font-semibold'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-[#1e2024]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
