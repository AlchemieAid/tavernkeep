'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, X, Check, AlertTriangle } from 'lucide-react'
import { TERRAIN_TYPES, TERRAIN_TYPE_MAP, TERRAIN_GROUPS, type GapBridge } from '@/lib/constants/terrain-types'
import type { DetectedTerrainRegion } from '@/lib/world/terrainSeeds'

interface SeedEntry {
  id: string
  terrain_type: string
  x_pct: number
  y_pct: number
}

interface TerrainSeedPainterProps {
  mapId: string
  campaignId: string
  mapImageUrl: string
  onBack: () => void
}

const GAP_OPTIONS: { value: GapBridge; label: string }[] = [
  { value: 'tight', label: 'Tight' },
  { value: 'medium', label: 'Mid' },
  { value: 'wide', label: 'Wide' },
]

const DEBOUNCE_MS = 250

export function TerrainSeedPainter({ mapId, campaignId, mapImageUrl, onBack }: TerrainSeedPainterProps) {
  const router = useRouter()

  const [selectedType, setSelectedType] = useState<string>(TERRAIN_TYPES[0].value)
  const [gapByType, setGapByType] = useState<Record<string, GapBridge>>(
    () => Object.fromEntries(TERRAIN_TYPES.map(t => [t.value, t.defaultGapBridge]))
  )
  const [seeds, setSeeds] = useState<SeedEntry[]>([])
  const [regionByType, setRegionByType] = useState<Record<string, DetectedTerrainRegion | null>>({})
  const [detectingTypes, setDetectingTypes] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs for latest values inside debounced async callbacks
  const seedsRef = useRef(seeds)
  seedsRef.current = seeds
  const gapRef = useRef(gapByType)
  gapRef.current = gapByType

  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Warm the pixel cache as soon as the painter opens
  useEffect(() => {
    fetch('/api/world/terrain-pixel-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_id: mapId, image_url: mapImageUrl }),
    }).catch(() => { /* fallback: terrain-seeds will load fresh */ })
  }, [mapId, mapImageUrl])

  const runFill = useCallback(async (terrainType: string) => {
    const typeSeeds = seedsRef.current.filter(s => s.terrain_type === terrainType)
    if (typeSeeds.length === 0) {
      setRegionByType(prev => ({ ...prev, [terrainType]: null }))
      return
    }
    setDetectingTypes(prev => new Set([...prev, terrainType]))
    try {
      const res = await fetch('/api/world/terrain-seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          map_id: mapId,
          image_url: mapImageUrl,
          seeds: typeSeeds.map(s => ({
            terrain_type: s.terrain_type,
            x_pct: s.x_pct,
            y_pct: s.y_pct,
            gap_bridge: gapRef.current[s.terrain_type] ?? 'medium',
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Detection failed')
      const regions: DetectedTerrainRegion[] = json.data ?? []
      setRegionByType(prev => ({ ...prev, [terrainType]: regions.find(r => r.terrain_type === terrainType) ?? null }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setDetectingTypes(prev => { const s = new Set(prev); s.delete(terrainType); return s })
    }
  }, [mapId, mapImageUrl])

  const scheduleFill = useCallback((terrainType: string) => {
    const existing = debounceTimers.current.get(terrainType)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      debounceTimers.current.delete(terrainType)
      void runFill(terrainType)
    }, DEBOUNCE_MS)
    debounceTimers.current.set(terrainType, timer)
  }, [runFill])

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x_pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y_pct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setSeeds(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      terrain_type: selectedType,
      x_pct,
      y_pct,
    }])
    setError(null)
    scheduleFill(selectedType)
  }, [selectedType, scheduleFill])

  const removeSeed = useCallback((id: string, terrainType: string) => {
    setSeeds(prev => prev.filter(s => s.id !== id))
    scheduleFill(terrainType)
  }, [scheduleFill])

  const handleGapChange = useCallback((terrainType: string, gap: GapBridge) => {
    setGapByType(prev => ({ ...prev, [terrainType]: gap }))
    scheduleFill(terrainType)
  }, [scheduleFill])

  async function handleSave() {
    const toSave = Object.values(regionByType).filter(Boolean) as DetectedTerrainRegion[]
    if (toSave.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      for (const region of toSave) {
        const res = await fetch('/api/world/add-terrain-area', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            map_id: mapId,
            campaign_id: campaignId,
            terrain_type: region.terrain_type,
            polygon: region.polygon,
          }),
        })
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Save failed')
      }
      const stageRes = await fetch('/api/world/mark-terrain-classified', {
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

  const typesWithSeeds = useMemo(() => [...new Set(seeds.map(s => s.terrain_type))], [seeds])
  const savedRegionCount = Object.values(regionByType).filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#111316]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-manrope text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to setup options
        </button>

        <div className="mb-6">
          <h1 className="font-noto-serif text-2xl text-on-surface mb-1">Seed Detection</h1>
          <p className="text-sm font-manrope text-on-surface-variant">
            Select a terrain type, then click on the map where it appears. Add multiple seeds per type for better coverage.
          </p>
        </div>

        <div className="flex gap-6">
          {/* ── Left panel: terrain types ── */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {TERRAIN_GROUPS.map(group => {
              const groupTypes = TERRAIN_TYPES.filter(t => t.group === group)
              return (
                <div key={group}>
                  <div className="text-[10px] font-manrope font-semibold text-on-surface-variant uppercase tracking-widest mb-2 px-1">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {groupTypes.map(tt => {
                      const isSelected = selectedType === tt.value
                      const seedCount = seeds.filter(s => s.terrain_type === tt.value).length
                      return (
                        <div
                          key={tt.value}
                          className={`rounded-lg transition-all ${isSelected ? 'bg-[#1e2023] ring-1 ring-primary/40' : 'hover:bg-[#1a1c1f]'}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedType(tt.value)}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left"
                          >
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tt.color }} />
                            <span className={`flex-1 text-xs font-manrope ${isSelected ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                              {tt.label}
                            </span>
                            {seedCount > 0 && (
                              <span className="text-[10px] font-manrope font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tt.color}33`, color: tt.color }}>
                                {seedCount}
                              </span>
                            )}
                          </button>
                          {isSelected && (
                            <div className="flex gap-1 px-2.5 pb-2">
                              {GAP_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleGapChange(tt.value, opt.value)}
                                  className={`flex-1 text-[10px] font-manrope font-semibold py-1 rounded transition-colors ${
                                    gapByType[tt.value] === opt.value
                                      ? 'bg-primary text-[#3f2e00]'
                                      : 'bg-[#282a2d] text-on-surface-variant hover:bg-[#2e3035]'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Right panel: map + overlay ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">

            {/* Focus chips — one per type that has seeds */}
            {typesWithSeeds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {typesWithSeeds.map(type => {
                  const def = TERRAIN_TYPE_MAP[type]
                  const isFocused = selectedType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-manrope font-semibold transition-all ${
                        isFocused ? 'ring-1 ring-white/30' : 'opacity-50 hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: `${def?.color ?? '#888'}22`,
                        color: def?.color ?? '#888',
                        border: `1px solid ${def?.color ?? '#888'}44`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: def?.color ?? '#888' }} />
                      {def?.label ?? type}
                      {detectingTypes.has(type) && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                      {!detectingTypes.has(type) && regionByType[type] && <Check className="w-2.5 h-2.5" />}
                    </button>
                  )
                })}
                <span className="self-center text-[10px] font-manrope text-on-surface-variant ml-1 opacity-60">
                  Viewing: <span className="text-on-surface" style={{ color: TERRAIN_TYPE_MAP[selectedType]?.color }}>{TERRAIN_TYPE_MAP[selectedType]?.label ?? selectedType}</span>
                </span>
              </div>
            )}

            {/* Map + SVG overlay */}
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
                {/* Only the focused type's region overlay */}
                {(() => {
                  const region = regionByType[selectedType]
                  const def = TERRAIN_TYPE_MAP[selectedType]
                  const color = def?.color ?? '#888'
                  if (!region) return null
                  const points = region.polygon.map(p => `${p.x * 100},${p.y * 100}`).join(' ')
                  return (
                    <polygon
                      points={points}
                      fill={color}
                      fillOpacity={0.45}
                      stroke={color}
                      strokeWidth="0.2"
                      strokeOpacity={0.8}
                    />
                  )
                })()}
                {/* Seed pins for focused type */}
                {seeds
                  .filter(s => s.terrain_type === selectedType)
                  .map(seed => {
                    const color = TERRAIN_TYPE_MAP[seed.terrain_type]?.color ?? '#888'
                    return (
                      <circle
                        key={seed.id}
                        cx={seed.x_pct * 100}
                        cy={seed.y_pct * 100}
                        r="1.2"
                        fill={color}
                        stroke="white"
                        strokeWidth="0.4"
                      />
                    )
                  })}
              </svg>

              {seeds.filter(s => s.terrain_type === selectedType).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
                    <p className="text-sm font-manrope text-on-surface">
                      Click to seed{' '}
                      <span className="font-semibold" style={{ color: TERRAIN_TYPE_MAP[selectedType]?.color }}>
                        {TERRAIN_TYPE_MAP[selectedType]?.label ?? selectedType}
                      </span>
                    </p>
                    <p className="text-xs font-manrope text-on-surface-variant mt-1">Fill appears instantly</p>
                  </div>
                </div>
              )}
              {detectingTypes.has(selectedType) && (
                <div className="absolute top-3 left-3 pointer-events-none">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-xs font-manrope text-on-surface">Detecting…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Seed pills for focused type */}
            {seeds.filter(s => s.terrain_type === selectedType).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {seeds
                  .filter(s => s.terrain_type === selectedType)
                  .map((seed, idx) => {
                    const def = TERRAIN_TYPE_MAP[seed.terrain_type]
                    return (
                      <div
                        key={seed.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-manrope"
                        style={{ backgroundColor: `${def?.color ?? '#888'}22`, color: def?.color ?? '#888', border: `1px solid ${def?.color ?? '#888'}44` }}
                      >
                        Seed {idx + 1}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeSeed(seed.id, seed.terrain_type) }}
                          className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-[#93000a]/20 px-4 py-3 flex items-start gap-2 text-sm font-manrope text-[#ffb4ab]">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={savedRegionCount === 0 || isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</>
              ) : savedRegionCount > 0 ? (
                <><Check className="w-4 h-4" /> Save {savedRegionCount} Region{savedRegionCount !== 1 ? 's' : ''} &amp; Continue</>
              ) : (
                'Place seeds on the map to detect terrain'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
