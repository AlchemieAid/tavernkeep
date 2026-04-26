'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, X, Crosshair, Check, AlertTriangle } from 'lucide-react'
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

export function TerrainSeedPainter({ mapId, campaignId, mapImageUrl, onBack }: TerrainSeedPainterProps) {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)

  const [selectedType, setSelectedType] = useState<string>(TERRAIN_TYPES[0].value)
  const [gapByType, setGapByType] = useState<Record<string, GapBridge>>(
    () => Object.fromEntries(TERRAIN_TYPES.map(t => [t.value, t.defaultGapBridge]))
  )
  const [seeds, setSeeds] = useState<SeedEntry[]>([])
  const [detectedRegions, setDetectedRegions] = useState<DetectedTerrainRegion[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setDetectedRegions([]) // clear old results when seeds change
    setError(null)
  }, [selectedType])

  const removeSeed = useCallback((id: string) => {
    setSeeds(prev => prev.filter(s => s.id !== id))
    setDetectedRegions([])
  }, [])

  async function handleDetect() {
    if (seeds.length === 0) return
    setIsDetecting(true)
    setError(null)
    try {
      const res = await fetch('/api/world/terrain-seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          map_id: mapId,
          image_url: mapImageUrl,
          seeds: seeds.map(s => ({
            terrain_type: s.terrain_type,
            x_pct: s.x_pct,
            y_pct: s.y_pct,
            gap_bridge: gapByType[s.terrain_type] ?? 'medium',
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Detection failed')
      setDetectedRegions(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsDetecting(false)
    }
  }

  async function handleSave() {
    if (detectedRegions.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      for (const region of detectedRegions) {
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
                                  onClick={() => setGapByType(prev => ({ ...prev, [tt.value]: opt.value }))}
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
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div
              ref={mapRef}
              className="relative rounded-xl overflow-hidden cursor-crosshair"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
              onClick={handleMapClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapImageUrl}
                alt="Campaign map"
                className="w-full block pointer-events-none"
              />
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Detected region overlays */}
                {detectedRegions.map((region, ri) => {
                  const def = TERRAIN_TYPE_MAP[region.terrain_type]
                  const color = def?.color ?? '#888'
                  const points = region.polygon.map(p => `${p.x * 100},${p.y * 100}`).join(' ')
                  return (
                    <polygon
                      key={ri}
                      points={points}
                      fill={color}
                      fillOpacity={0.45}
                      stroke={color}
                      strokeWidth="0.2"
                      strokeOpacity={0.8}
                    />
                  )
                })}
                {/* Seed pins */}
                {seeds.map(seed => {
                  const def = TERRAIN_TYPE_MAP[seed.terrain_type]
                  const color = def?.color ?? '#888'
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
              {seeds.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-primary" />
                    <span className="text-sm font-manrope text-on-surface">Click on the map to plant seeds</span>
                  </div>
                </div>
              )}
            </div>

            {/* Seed list + remove */}
            {seeds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {seeds.map(seed => {
                  const def = TERRAIN_TYPE_MAP[seed.terrain_type]
                  return (
                    <div
                      key={seed.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-manrope font-semibold"
                      style={{ backgroundColor: `${def?.color ?? '#888'}22`, color: def?.color ?? '#888', border: `1px solid ${def?.color ?? '#888'}44` }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: def?.color ?? '#888' }} />
                      {def?.label ?? seed.terrain_type}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeSeed(seed.id) }}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
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

            {detectedRegions.length > 0 && !error && (
              <div className="rounded-lg bg-[#0a2a0a]/60 border border-[#2E7D32]/30 px-4 py-3 flex items-center gap-2 text-sm font-manrope text-[#81C784]">
                <Check className="w-4 h-4 flex-shrink-0" />
                {detectedRegions.length} terrain region{detectedRegions.length !== 1 ? 's' : ''} detected.
                Adjust seeds above and re-detect, or save to continue.
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDetect}
                disabled={seeds.length === 0 || isDetecting || isSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-manrope font-semibold text-sm bg-[#1e2023] text-on-surface border border-white/10 hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isDetecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Detecting&hellip;</>
                ) : (
                  <><Crosshair className="w-4 h-4" /> Detect Terrain</>
                )}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={detectedRegions.length === 0 || isSaving || isDetecting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</>
                ) : (
                  <><Check className="w-4 h-4" /> Save & Continue</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
