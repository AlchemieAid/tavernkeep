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

// ─── Resource catalogue ─────────────────────────────────────────────────────
//
// `density` = multiplier on top of BASE_DENSITY (50 per full-map area unit).
// Lower values = rarer resources. Add new types here AND add a matching entry
// in RESOURCE_TERRAIN_AFFINITIES or the type will be skipped by auto-distribute.
//
// Categories mirror what the AI classifier would produce so the two approaches
// produce consistent output. To add a new resource:
//   1. Add an entry here with a unique `value`, display `label`, dot `color`, relative `density`, and `category`.
//   2. Add a `value: string[]` entry in RESOURCE_TERRAIN_AFFINITIES.

const RESOURCE_CATEGORIES = ['Minerals', 'Food & Water', 'Nature', 'Trade', 'Special'] as const
type ResourceCategory = typeof RESOURCE_CATEGORIES[number]

const RESOURCE_TYPES: {
  value: string; label: string; color: string; density: number; category: ResourceCategory
}[] = [
  // ── Minerals ────────────────────────────────────────────────────────────────
  { value: 'iron_deposit',    label: 'Iron Deposit',    color: '#78909C', density: 0.9,  category: 'Minerals'      },
  { value: 'copper_deposit',  label: 'Copper Deposit',  color: '#D4A574', density: 0.7,  category: 'Minerals'      },
  { value: 'gold_vein',       label: 'Gold Vein',       color: '#FDD835', density: 0.35, category: 'Minerals'      },
  { value: 'silver_vein',     label: 'Silver Vein',     color: '#CFD8DC', density: 0.4,  category: 'Minerals'      },
  { value: 'mithril_seam',    label: 'Mithril Seam',    color: '#90CAF9', density: 0.08, category: 'Minerals'      }, // Very rare — deep peaks only
  { value: 'gem_cluster',     label: 'Gem Cluster',     color: '#AB47BC', density: 0.3,  category: 'Minerals'      },
  { value: 'coal_seam',       label: 'Coal Seam',       color: '#546E7A', density: 0.8,  category: 'Minerals'      },
  { value: 'stone_quarry',    label: 'Stone Quarry',    color: '#90A4AE', density: 1.0,  category: 'Minerals'      },
  { value: 'salt_flat',       label: 'Salt Flat',       color: '#E0E0E0', density: 0.5,  category: 'Minerals'      },
  { value: 'sulfur_vent',     label: 'Sulfur Vent',     color: '#F9A825', density: 0.4,  category: 'Minerals'      },
  // ── Food & Water ────────────────────────────────────────────────────────────
  { value: 'fertile_farmland',label: 'Fertile Farmland',color: '#FFA726', density: 1.0,  category: 'Food & Water'  },
  { value: 'grazing_land',    label: 'Grazing Land',    color: '#66BB6A', density: 0.9,  category: 'Food & Water'  },
  { value: 'orchard',         label: 'Orchard',         color: '#43A047', density: 0.6,  category: 'Food & Water'  },
  { value: 'deep_fishery',    label: 'Deep Fishery',    color: '#1565C0', density: 0.8,  category: 'Food & Water'  },
  { value: 'coastal_fishery', label: 'Coastal Fishery', color: '#26C6DA', density: 1.0,  category: 'Food & Water'  },
  { value: 'river_fishery',   label: 'River Fishery',   color: '#039BE5', density: 0.8,  category: 'Food & Water'  },
  // ── Nature ──────────────────────────────────────────────────────────────────
  { value: 'ancient_forest',  label: 'Ancient Forest',  color: '#1B5E20', density: 0.4,  category: 'Nature'        },
  { value: 'managed_woodland',label: 'Managed Woodland',color: '#388E3C', density: 0.8,  category: 'Nature'        },
  { value: 'rare_herbs',      label: 'Rare Herbs',      color: '#8BC34A', density: 0.5,  category: 'Nature'        },
  // ── Trade ───────────────────────────────────────────────────────────────────
  { value: 'natural_harbor',  label: 'Natural Harbor',  color: '#0277BD', density: 0.4,  category: 'Trade'         },
  { value: 'river_ford',      label: 'River Ford',      color: '#29B6F6', density: 0.5,  category: 'Trade'         },
  { value: 'mountain_pass',   label: 'Mountain Pass',   color: '#795548', density: 0.3,  category: 'Trade'         },
  { value: 'trade_crossroads',label: 'Trade Crossroads',color: '#FF8F00', density: 0.3,  category: 'Trade'         },
  { value: 'oasis',           label: 'Oasis',           color: '#00897B', density: 0.3,  category: 'Trade'         },
  { value: 'river_confluence',label: 'River Confluence',color: '#0288D1', density: 0.35, category: 'Trade'         },
  // ── Special ─────────────────────────────────────────────────────────────────
  { value: 'arcane_nexus',    label: 'Arcane Nexus',    color: '#7C4DFF', density: 0.08, category: 'Special'       }, // Very rare — place manually
  { value: 'ancient_ruins',   label: 'Ancient Ruins',   color: '#A1887F', density: 0.15, category: 'Special'       },
  { value: 'volcanic_soil',   label: 'Volcanic Soil',   color: '#E53935', density: 0.6,  category: 'Special'       },
  { value: 'hot_springs',     label: 'Hot Springs',     color: '#F06292', density: 0.35, category: 'Special'       },
]

const RESOURCE_TYPE_MAP = Object.fromEntries(RESOURCE_TYPES.map(r => [r.value, r]))

// ─── Terrain-resource affinities ─────────────────────────────────────────────
//
// Maps each resource value to terrain types where it naturally occurs.
// Auto-distribute respects these; manual click placement ignores them.
//
// Design notes:
//   - Metals form in elevated rocky terrain; mithril exclusively in high_mountains.
//   - Gems form in volcanic / metamorphic rock (mountains, hills, volcanic).
//   - Salt: coastal evaporation beds and arid desert flats.
//   - Food resources map to the biome that produces them (water → fish, etc.).
//   - Trade routes occur where geography creates natural chokepoints or crossings.
//   - Special resources are rare; arcane_nexus and ancient_ruins span many terrains.
//
// NOTE: Intentionally kept as a code constant.
// Future: `resource_terrain_affinities` DB table for per-campaign overrides.

const RESOURCE_TERRAIN_AFFINITIES: Record<string, string[]> = {
  // ── Minerals ────────────────────────────────────────────────────────────────
  iron_deposit:    ['mountains', 'hills', 'high_mountains', 'badlands', 'volcanic'],
  copper_deposit:  ['mountains', 'hills', 'high_mountains'],
  gold_vein:       ['mountains', 'high_mountains', 'hills', 'badlands'],
  silver_vein:     ['mountains', 'high_mountains', 'hills'],
  mithril_seam:    ['high_mountains'],                        // Deepest peaks only
  gem_cluster:     ['mountains', 'high_mountains', 'hills', 'volcanic'],
  coal_seam:       ['mountains', 'hills', 'badlands'],
  stone_quarry:    ['mountains', 'hills', 'high_mountains', 'badlands', 'volcanic', 'tundra', 'arctic'],
  salt_flat:       ['coast', 'desert'],
  sulfur_vent:     ['volcanic'],
  // ── Food & Water ────────────────────────────────────────────────────────────
  fertile_farmland:['plains', 'grassland', 'farmland'],
  grazing_land:    ['plains', 'grassland', 'hills'],
  orchard:         ['plains', 'grassland', 'farmland', 'forest'],
  deep_fishery:    ['ocean', 'lake'],
  coastal_fishery: ['coast', 'ocean'],
  river_fishery:   ['river', 'lake', 'coast'],
  // ── Nature ──────────────────────────────────────────────────────────────────
  ancient_forest:  ['forest', 'jungle'],
  managed_woodland:['forest'],
  rare_herbs:      ['forest', 'jungle', 'swamp', 'plains', 'grassland'],
  // ── Trade ───────────────────────────────────────────────────────────────────
  natural_harbor:  ['coast', 'ocean'],
  river_ford:      ['river'],
  mountain_pass:   ['mountains', 'high_mountains', 'hills'],
  trade_crossroads:['plains', 'grassland', 'farmland', 'desert'],
  oasis:           ['desert'],
  river_confluence:['river', 'lake'],
  // ── Special ─────────────────────────────────────────────────────────────────
  arcane_nexus:    ['forest', 'mountains', 'high_mountains', 'swamp', 'volcanic', 'arctic'],
  ancient_ruins:   ['plains', 'grassland', 'desert', 'forest', 'mountains', 'badlands'],
  volcanic_soil:   ['volcanic'],
  hot_springs:     ['mountains', 'volcanic', 'tundra', 'arctic'],
}

/**
 * Base scatter density: resources per full-map area unit (0–1 normalised).
 * Terrain at 5% of map → area ≈ 0.05 → 50 × 0.05 × density placed points.
 */
const BASE_DENSITY = 50

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

  // Auto-distribute ALL resource types across their terrain affinities.
  // For each resource: finds matching terrain areas → scatters points proportional
  // to polygon area × BASE_DENSITY × per-type density.
  const handleAutoDistribute = useCallback(() => {
    const newPoints: PlacedResource[] = []
    for (const rt of RESOURCE_TYPES) {
      const validTerrains = RESOURCE_TERRAIN_AFFINITIES[rt.value]
      if (!validTerrains || validTerrains.length === 0) continue
      const matchingAreas = terrainAreas.filter(a => validTerrains.includes(a.terrain_type))
      for (const area of matchingAreas) {
        if (area.polygon.length < 3) continue
        const areaFraction = polygonArea(area.polygon)
        const count = Math.max(1, Math.round(areaFraction * BASE_DENSITY * rt.density))
        const pts = scatterInPolygon(area.polygon, count)
        for (const pt of pts) {
          newPoints.push({
            id: crypto.randomUUID(),
            x_pct: pt.x,
            y_pct: pt.y,
            resource_type: rt.value,
            richness,
          })
        }
      }
    }
    setPlaced(prev => [...prev, ...newPoints])
  }, [terrainAreas, richness])

  async function handleSave() {
    if (placed.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      // Single batch request — one DB insert for all points
      const batchRes = await fetch('/api/world/add-resource-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          map_id: mapId,
          campaign_id: campaignId,
          points: placed.map(r => ({
            x_pct: r.x_pct,
            y_pct: r.y_pct,
            resource_type: r.resource_type,
            richness: r.richness,
            influence_radius_pct: 0.15,
          })),
        }),
      })
      const batchJson = await batchRes.json()
      if (!batchRes.ok || batchJson.error) throw new Error(batchJson.error?.message ?? 'Save failed')

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

            {/* Resource type picker — grouped by category */}
            <div className="overflow-y-auto max-h-[calc(100vh-340px)] space-y-3 pr-1">
              {RESOURCE_CATEGORIES.map(cat => {
                const typesInCat = RESOURCE_TYPES.filter(r => r.category === cat)
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-manrope font-semibold text-on-surface-variant uppercase tracking-widest mb-1 px-1">
                      {cat}
                    </div>
                    <div className="space-y-0.5">
                      {typesInCat.map(rt => {
                        const isSelected = selectedResource === rt.value
                        const cnt = countByType[rt.value] ?? 0
                        const hasAffinity = (RESOURCE_TERRAIN_AFFINITIES[rt.value] ?? []).some(t =>
                          terrainAreas.some(a => a.terrain_type === t)
                        )
                        return (
                          <button
                            key={rt.value}
                            type="button"
                            onClick={() => setSelectedResource(rt.value)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                              isSelected ? 'bg-[#1e2023] ring-1 ring-primary/40' : 'hover:bg-[#1a1c1f]'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: rt.color }} />
                            <span className={`flex-1 text-[11px] font-manrope ${
                              isSelected ? 'text-on-surface font-semibold' : hasAffinity ? 'text-on-surface-variant' : 'text-on-surface-variant opacity-40'
                            }`}>
                              {rt.label}
                            </span>
                            {cnt > 0 && (
                              <span className="text-[9px] font-manrope font-bold px-1 py-0.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `${rt.color}33`, color: rt.color }}>
                                {cnt}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
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
