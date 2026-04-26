'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, X, PenTool, Check, AlertTriangle, Trash2 } from 'lucide-react'
import { TERRAIN_TYPES, TERRAIN_TYPE_MAP, TERRAIN_GROUPS } from '@/lib/constants/terrain-types'

interface Point { x: number; y: number }

interface ZoneEntry {
  id: string
  terrain_type: string
  polygon: Point[]
}

interface TerrainZonePainterProps {
  mapId: string
  campaignId: string
  mapImageUrl: string
  onBack: () => void
}

export function TerrainZonePainter({ mapId, campaignId, mapImageUrl, onBack }: TerrainZonePainterProps) {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)

  const [selectedType, setSelectedType] = useState<string>(TERRAIN_TYPES[0].value)
  const [zones, setZones] = useState<ZoneEntry[]>([])
  const [currentVertices, setCurrentVertices] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDrawing = currentVertices.length > 0

  const toRelative = useCallback((e: React.MouseEvent<HTMLDivElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    }
  }, [])

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const pt = toRelative(e)
    if (e.detail === 2) {
      // Double-click: close polygon (ignore the second vertex added by first click in the dblclick pair)
      setCurrentVertices(prev => {
        if (prev.length < 3) return prev
        const poly = prev.slice(0, -1) // remove the duplicate added by the first click of dblclick
        if (poly.length >= 3) {
          setZones(z => [...z, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            terrain_type: selectedType,
            polygon: poly,
          }])
        }
        return []
      })
      setMousePos(null)
      return
    }
    setCurrentVertices(prev => [...prev, pt])
  }, [toRelative, selectedType])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return
    setMousePos(toRelative(e))
  }, [isDrawing, toRelative])

  const handleMouseLeave = useCallback(() => setMousePos(null), [])

  function cancelDrawing() {
    setCurrentVertices([])
    setMousePos(null)
  }

  function removeZone(id: string) {
    setZones(prev => prev.filter(z => z.id !== id))
  }

  async function handleSave() {
    if (zones.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      for (const zone of zones) {
        const res = await fetch('/api/world/add-terrain-area', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            map_id: mapId,
            campaign_id: campaignId,
            terrain_type: zone.terrain_type,
            polygon: zone.polygon,
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

  function polygonPoints(vertices: Point[]): string {
    return vertices.map(p => `${p.x * 100},${p.y * 100}`).join(' ')
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
          <h1 className="font-noto-serif text-2xl text-on-surface mb-1">Paint Zones</h1>
          <p className="text-sm font-manrope text-on-surface-variant">
            Select a terrain type, click to place vertices, then double-click to close the polygon.
          </p>
        </div>

        <div className="flex gap-6">
          {/* ── Left panel ── */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {TERRAIN_GROUPS.map(group => {
              const groupTypes = TERRAIN_TYPES.filter(t => t.group === group)
              return (
                <div key={group}>
                  <div className="text-[10px] font-manrope font-semibold text-on-surface-variant uppercase tracking-widest mb-2 px-1">
                    {group}
                  </div>
                  <div className="space-y-0.5">
                    {groupTypes.map(tt => {
                      const zoneCount = zones.filter(z => z.terrain_type === tt.value).length
                      const isSelected = selectedType === tt.value
                      return (
                        <button
                          key={tt.value}
                          type="button"
                          onClick={() => setSelectedType(tt.value)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                            isSelected ? 'bg-[#1e2023] ring-1 ring-primary/40' : 'hover:bg-[#1a1c1f]'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tt.color }} />
                          <span className={`flex-1 text-xs font-manrope ${isSelected ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                            {tt.label}
                          </span>
                          {zoneCount > 0 && (
                            <span className="text-[10px] font-manrope font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tt.color}33`, color: tt.color }}>
                              {zoneCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Drawn zones list */}
            {zones.length > 0 && (
              <div className="mt-6">
                <div className="text-[10px] font-manrope font-semibold text-on-surface-variant uppercase tracking-widest mb-2 px-1">
                  Drawn Zones ({zones.length})
                </div>
                <div className="space-y-1">
                  {zones.map((zone, idx) => {
                    const def = TERRAIN_TYPE_MAP[zone.terrain_type]
                    return (
                      <div
                        key={zone.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1a1c1f]"
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: def?.color ?? '#888' }} />
                        <span className="flex-1 text-xs font-manrope text-on-surface-variant truncate">
                          {def?.label ?? zone.terrain_type} {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeZone(zone.id)}
                          className="text-on-surface-variant hover:text-[#ffb4ab] transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right panel: map + SVG overlay ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div
              ref={mapRef}
              className={`relative rounded-xl overflow-hidden ${isDrawing ? 'cursor-crosshair' : 'cursor-crosshair'}`}
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
              onClick={handleMapClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
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
                {/* Completed zones */}
                {zones.map(zone => {
                  const def = TERRAIN_TYPE_MAP[zone.terrain_type]
                  const color = def?.color ?? '#888'
                  return (
                    <polygon
                      key={zone.id}
                      points={polygonPoints(zone.polygon)}
                      fill={color}
                      fillOpacity={0.4}
                      stroke={color}
                      strokeWidth="0.25"
                      strokeOpacity={0.9}
                    />
                  )
                })}

                {/* In-progress polygon */}
                {currentVertices.length > 0 && (() => {
                  const def = TERRAIN_TYPE_MAP[selectedType]
                  const color = def?.color ?? '#888'
                  const allPts = mousePos ? [...currentVertices, mousePos] : currentVertices
                  return (
                    <>
                      {currentVertices.length > 1 && (
                        <polygon
                          points={polygonPoints(currentVertices)}
                          fill={color}
                          fillOpacity={0.25}
                          stroke="none"
                        />
                      )}
                      <polyline
                        points={polygonPoints(allPts)}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.4"
                        strokeDasharray="1,0.5"
                        strokeOpacity={0.9}
                      />
                      {currentVertices.map((v, i) => (
                        <circle key={i} cx={v.x * 100} cy={v.y * 100} r="0.8" fill={color} stroke="white" strokeWidth="0.3" />
                      ))}
                    </>
                  )
                })()}
              </svg>

              {zones.length === 0 && !isDrawing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-primary" />
                    <span className="text-sm font-manrope text-on-surface">Click to start drawing a polygon</span>
                  </div>
                </div>
              )}

              {isDrawing && (
                <div className="absolute top-3 right-3 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cancelDrawing() }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-manrope text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel shape
                  </button>
                </div>
              )}
            </div>

            {isDrawing && (
              <p className="text-xs font-manrope text-on-surface-variant text-center">
                {currentVertices.length} vert{currentVertices.length !== 1 ? 'ices' : 'ex'} placed &mdash; double-click to close the polygon
              </p>
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
              disabled={zones.length === 0 || isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</>
              ) : (
                <><Check className="w-4 h-4" /> Save {zones.length > 0 ? `${zones.length} Zone${zones.length !== 1 ? 's' : ''}` : 'All Zones'} & Continue</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
