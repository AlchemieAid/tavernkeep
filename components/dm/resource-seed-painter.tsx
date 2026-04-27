'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Check, X, AlertTriangle, Shuffle } from 'lucide-react'
import { TERRAIN_TYPE_MAP } from '@/lib/constants/terrain-types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerrainAreaShape {
  id: string
  terrain_type: string
  polygon: Array<{ x: number; y: number }>
}

interface PlacedResource {
  id: string
  x_pct: number
  y_pct: number
  resource_type: string
  richness: number
}

interface ResourceSeedPainterProps {
  mapId: string
  campaignId: string
  mapImageUrl: string
  terrainAreas: TerrainAreaShape[]
  onBack: () => void
}

// ─── Resource type catalogue ──────────────────────────────────────────────────

const RESOURCE_TYPES = [
  { value: 'iron',    label: 'Iron',    color: '#78909C' },
  { value: 'gold',    label: 'Gold',    color: '#FDD835' },
  { value: 'timber',  label: 'Timber',  color: '#6D4C41' },
  { value: 'fish',    label: 'Fish',    color: '#26C6DA' },
  { value: 'stone',   label: 'Stone',   color: '#90A4AE' },
  { value: 'coal',    label: 'Coal',    color: '#546E7A' },
  { value: 'gems',    label: 'Gems',    color: '#AB47BC' },
  { value: 'herbs',   label: 'Herbs',   color: '#66BB6A' },
  { value: 'crops',   label: 'Crops',   color: '#FFA726' },
  { value: 'game',    label: 'Game',    color: '#A5D6A7' },
  { value: 'salt',    label: 'Salt',    color: '#E0E0E0' },
  { value: 'peat',    label: 'Peat',    color: '#8D6E63' },
]

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function pointInPolygon(px: number, py: number, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function polygonArea(polygon: Array<{ x: number; y: number }>): number {
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y
  }
  return Math.abs(area) / 2
}

/** Scatter `count` random points inside a polygon using rejection sampling. */
function scatterInPolygon(polygon: Array<{ x: number; y: number }>, count: number): Array<{ x: number; y: number }> {
  const xs = polygon.map(p => p.x)
  const ys = polygon.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const points: Array<{ x: number; y: number }> = []
  let attempts = 0
  while (points.length < count && attempts < count * 100) {
    attempts++
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    if (pointInPolygon(x, y, polygon)) {
      points.push({ x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 })
    }
  }
  return points
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResourceSeedPainter({
  mapId, campaignId, mapImageUrl, terrainAreas, onBack,
}: ResourceSeedPainterProps) {
  const router = useRouter()
  const [selectedResource, setSelectedResource] = useState(RESOURCE_TYPES[0].value)
  const [richness, setRichness] = useState(5)
  const [placed, setPlaced] = useState<PlacedResource[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x_pct = Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 10000
    const y_pct = Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 10000
    setPlaced(prev => [...prev, {
      id: crypto.randomUUID(),
      x_pct, y_pct,
      resource_type: selectedResource,
      richness,
    }])
  }, [selectedResource, richness])

  /** Auto-scatter resources across all terrain areas proportional to polygon size.
   *  Density: 1 resource per ~2% of map area (density multiplier = 50). */
  const handleAutoDistribute = useCallback(() => {
    const DENSITY = 50
    const newPoints: PlacedResource[] = []
    for (const area of terrainAreas) {
      if (area.polygon.length < 3) continue
      const area_fraction = polygonArea(area.polygon)
      const count = Math.max(1, Math.round(area_fraction * DENSITY))
      const pts = scatterInPolygon(area.polygon, count)
      for (const pt of pts) {
        newPoints.push({
          id: crypto.randomUUID(),
          x_pct: pt.x,
          y_pct: pt.y,
          resource_type: selectedResource,
          richness,
        })
      }
    }
    setPlaced(prev => [...prev, ...newPoints])
  }, [terrainAreas, selectedResource, richness])

  const removeResource = useCallback((id: string) => {
    setPlaced(prev => prev.filter(r => r.id !== id))
  }, [])

  async function handleSave() {
    if (placed.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      for (const r of placed) {
        const res = await fetch('/api/world/add-resource-point', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            map_id: mapId,
            campaign_id: campaignId,
            x_pct: r.x_pct,
            y_pct: r.y_pct,
            resource_type: r.resource_type,
            richness: r.richness,
            influence_radius_pct: 0.08,
          }),
        })
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Save failed')
      }

      const stageRes = await fetch('/api/world/mark-resources-placed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map_id: mapId, campaign_id: campaignId }),
      })
      const stageJson = await stageRes.json()
      if (!stageRes.ok || stageJson.error) throw new Error(stageJson.error?.message ?? 'Stage update failed')

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsSaving(false)
    }
  }

  const countByType = useMemo(() =>
    placed.reduce<Record<string, number>>((acc, r) => {
      acc[r.resource_type] = (acc[r.resource_type] ?? 0) + 1
      return acc
    }, {}),
  [placed])

  return (
    <div className="min-h-screen bg-[#111316]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-manrope text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-6">
          <h1 className="font-noto-serif text-2xl text-on-surface mb-1">Place Resources</h1>
          <p className="text-sm font-manrope text-on-surface-variant">
            Click the map to place individual resource points, or auto-distribute across all terrain areas.
          </p>
        </div>

        <div className="flex gap-6">
          {/* ── Left panel ── */}
          <div className="w-64 flex-shrink-0 space-y-5">

            {/* Resource type picker */}
            <div>
              <div className="text-[10px] font-manrope font-semibold text-on-surface-variant uppercase tracking-widest mb-2 px-1">
                Resource Type
              </div>
              <div className="space-y-0.5">
                {RESOURCE_TYPES.map(rt => {
                  const isSelected = selectedResource === rt.value
                  const cnt = countByType[rt.value] ?? 0
                  return (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setSelectedResource(rt.value)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                        isSelected ? 'bg-[#1e2023] ring-1 ring-primary/40' : 'hover:bg-[#1a1c1f]'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: rt.color }} />
                      <span className={`flex-1 text-xs font-manrope ${isSelected ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                        {rt.label}
                      </span>
                      {cnt > 0 && (
                        <span className="text-[10px] font-manrope font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${rt.color}33`, color: rt.color }}>
                          {cnt}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Richness slider */}
            <div className="px-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-manrope text-on-surface-variant">Richness</span>
                <span className="text-[10px] font-manrope font-semibold text-primary">{richness}/10</span>
              </div>
              <input
                type="range" min={1} max={10} step={1} value={richness}
                onChange={e => setRichness(Number(e.target.value))}
                className="w-full h-1 appearance-none rounded cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] font-manrope text-on-surface-variant">Sparse</span>
                <span className="text-[9px] font-manrope text-on-surface-variant">Abundant</span>
              </div>
            </div>

            {/* Auto-distribute */}
            {terrainAreas.length > 0 && (
              <button
                type="button"
                onClick={handleAutoDistribute}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#1e2023] hover:bg-[#252729] border border-primary/20 text-xs font-manrope font-semibold text-primary transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Auto-distribute across terrain
              </button>
            )}

            {/* Clear all */}
            {placed.length > 0 && (
              <button
                type="button"
                onClick={() => setPlaced([])}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-manrope text-on-surface-variant hover:text-[#ffb4ab] transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all ({placed.length})
              </button>
            )}
          </div>

          {/* ── Right panel: map ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">

            <div
              className="relative rounded-xl overflow-hidden cursor-crosshair"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
              onClick={handleMapClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapImageUrl}
                alt="Campaign map"
                className="w-full block pointer-events-none select-none"
                draggable={false}
              />
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Terrain area outlines for context */}
                {terrainAreas.map(area => {
                  const color = TERRAIN_TYPE_MAP[area.terrain_type]?.color ?? '#888'
                  const points = area.polygon.map(p => `${p.x * 100},${p.y * 100}`).join(' ')
                  return (
                    <polygon key={area.id} points={points}
                      fill={color} fillOpacity={0.12}
                      stroke={color} strokeWidth="0.15" strokeOpacity={0.5} />
                  )
                })}

                {/* Placed resource dots */}
                {placed.map(r => {
                  const color = RESOURCE_TYPES.find(t => t.value === r.resource_type)?.color ?? '#888'
                  const isSelected = r.resource_type === selectedResource
                  return (
                    <circle key={r.id}
                      cx={r.x_pct * 100} cy={r.y_pct * 100}
                      r={isSelected ? '1.4' : '1.0'}
                      fill={color}
                      stroke="white" strokeWidth="0.35"
                      fillOpacity={isSelected ? 1 : 0.7}
                    />
                  )
                })}
              </svg>

              {placed.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
                    <p className="text-sm font-manrope text-on-surface">Click to place resources</p>
                    <p className="text-xs font-manrope text-on-surface-variant mt-1">
                      Or use Auto-distribute to scatter across all terrain
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-[#93000a]/20 px-4 py-3 flex items-start gap-2 text-sm font-manrope text-[#ffb4ab]">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={placed.length === 0 || isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</>
              ) : placed.length > 0 ? (
                <><Check className="w-4 h-4" /> Save {placed.length} Resource{placed.length !== 1 ? 's' : ''} &amp; Continue</>
              ) : (
                'Place resources to continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
