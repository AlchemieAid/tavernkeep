'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Loader2, Layers, TreePine, Check, MapPin,
  Maximize2, X, AlertTriangle, SkipForward, RefreshCw,
} from 'lucide-react'
import { TerrainModeSelector, type TerrainMode } from '@/components/dm/terrain-mode-selector'
import { TerrainSeedPainter } from '@/components/dm/terrain-seed-painter'
import { TerrainZonePainter } from '@/components/dm/terrain-zone-painter'

interface MapSetupWizardProps {
  map: {
    id: string
    campaign_id: string
    image_url: string
    setup_stage: string
  }
  campaignId: string
  campaignName: string
  terrainAreaCount: number
  resourcePointCount: number
}

type Stage = 'created' | 'terrain_classified' | 'resources_placed'

const STAGES: { key: Stage; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'created', label: 'Classify Terrain', desc: 'AI reads the map image and identifies terrain blobs — plains, mountains, rivers, cities, and more.', icon: <Layers className="w-5 h-5" /> },
  { key: 'terrain_classified', label: 'Place Resources', desc: 'AI places resource points based on terrain — iron in mountains, fish at coasts, farmland in valleys.', icon: <TreePine className="w-5 h-5" /> },
  { key: 'resources_placed', label: 'Generate Atmosphere', desc: 'AI writes sensory read-aloud text for each terrain area. Your DM read-aloud is ready.', icon: <MapPin className="w-5 h-5" /> },
]

type SubStepStatus = 'pending' | 'running' | 'done' | 'skipped'
interface SubStep {
  label: string
  status: SubStepStatus
  message: string
}

const TERRAIN_SUBSTEPS: SubStep[] = [
  { label: 'Reading map style and visual language', status: 'pending', message: '' },
  { label: 'Identifying terrain zones', status: 'pending', message: '' },
  { label: 'Tracing rivers and coastlines', status: 'pending', message: '' },
  { label: 'Spotting landmarks and settlements', status: 'pending', message: '' },
]

type PipelineEvent =
  | { type: 'progress';      layer: number; message: string }
  | { type: 'layer_success'; layer: number; message: string }
  | { type: 'layer_failed';  layer: number; message: string }
  | { type: 'complete'; terrain_count: number; poi_count: number; skipped: string[] }
  | { type: 'error'; message: string }

export function MapSetupWizard({
  map,
  campaignId,
  campaignName,
  terrainAreaCount,
  resourcePointCount,
}: MapSetupWizardProps) {
  const router = useRouter()
  const currentStage = map.setup_stage as Stage
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [showFullMap, setShowFullMap] = useState(false)
  const [subSteps, setSubSteps] = useState<SubStep[]>(TERRAIN_SUBSTEPS.map(s => ({ ...s })))
  const [showSubSteps, setShowSubSteps] = useState(false)
  const [skippedLayers, setSkippedLayers] = useState<string[]>([])
  const [terrainMode, setTerrainMode] = useState<TerrainMode | null>(null)

  if (currentStage === 'created' && terrainMode === 'seed') {
    return (
      <TerrainSeedPainter
        mapId={map.id}
        campaignId={campaignId}
        mapImageUrl={map.image_url}
        onBack={() => setTerrainMode(null)}
      />
    )
  }

  if (currentStage === 'created' && terrainMode === 'paint') {
    return (
      <TerrainZonePainter
        mapId={map.id}
        campaignId={campaignId}
        mapImageUrl={map.image_url}
        onBack={() => setTerrainMode(null)}
      />
    )
  }

  function updateSubStep(layer: number, status: SubStepStatus, message: string) {
    setSubSteps(prev => {
      const next = [...prev]
      if (next[layer]) next[layer] = { ...next[layer], status, message }
      return next
    })
  }

  async function runTerrainClassification() {
    setSubSteps(TERRAIN_SUBSTEPS.map(s => ({ ...s })))
    setShowSubSteps(true)
    setSkippedLayers([])

    const res = await fetch('/api/world/classify-terrain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_id: map.id, image_url: map.image_url }),
    })

    if (!res.body) throw new Error('No stream received from terrain classifier')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const newSkipped: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''

      for (const chunk of lines) {
        const line = chunk.startsWith('data: ') ? chunk.slice(6) : chunk
        if (!line.trim()) continue

        let event: PipelineEvent
        try { event = JSON.parse(line) } catch { continue }

        if (event.type === 'progress') {
          updateSubStep(event.layer, 'running', event.message)
        } else if (event.type === 'layer_success') {
          updateSubStep(event.layer, 'done', event.message)
        } else if (event.type === 'layer_failed') {
          updateSubStep(event.layer, 'skipped', event.message)
        } else if (event.type === 'complete') {
          newSkipped.push(...(event.skipped ?? []))
          setSkippedLayers(newSkipped)
          if (newSkipped.length > 0) {
            setWarning(`${newSkipped.length} analysis step${newSkipped.length > 1 ? 's' : ''} skipped — map is usable, retry to improve`)
          }
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
    }
  }

  async function runStage() {
    setRunning(true)
    setError(null)
    setWarning(null)

    try {
      if (currentStage === 'created') {
        await runTerrainClassification()
      } else if (currentStage === 'terrain_classified') {
        const res = await fetch('/api/world/place-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ map_id: map.id, image_url: map.image_url }),
        })
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Resource placement failed')
      } else if (currentStage === 'resources_placed') {
        const res = await fetch('/api/world/mark-map-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ map_id: map.id, campaign_id: campaignId }),
        })
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Setup finalization failed')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  const stageIndex = STAGES.findIndex(s => s.key === currentStage)

  const stageButtonLabel: Record<Stage, string> = {
    created: 'Analyze Map with AI (Experimental)',
    terrain_classified: `Place Resources (${terrainAreaCount} terrain areas)`,
    resources_placed: 'Generate Atmosphere & Finish Setup',
  }

  return (
    <div className="bg-[#111316] px-6 py-8 max-w-3xl mx-auto">
      <Link
        href={`/dm/campaigns/${campaignId}/maps`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8 font-manrope"
      >
        <ChevronLeft className="w-4 h-4" />
        {campaignName}
      </Link>

      <div className="mb-8">
        <h1 className="font-noto-serif text-2xl text-on-surface mb-1">Map Setup</h1>
        <p className="text-sm font-manrope text-on-surface-variant">
          AI is analyzing your map. Complete each step to unlock the full map view.
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        {STAGES.map((s, i) => {
          const done = i < stageIndex
          const active = i === stageIndex
          return (
            <div
              key={s.key}
              className={`flex-1 h-1.5 rounded-full transition-all ${done ? 'bg-primary' : active ? 'bg-primary/40' : 'bg-[#282a2d]'}`}
            />
          )
        })}
      </div>

      <div
        className="rounded-xl overflow-hidden relative group cursor-pointer"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
        onClick={() => setShowFullMap(true)}
        role="button"
        aria-label="View full map"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={map.image_url}
          alt="Campaign map"
          className="w-full max-h-48 object-contain bg-[#0d0e10] opacity-90"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Maximize2 className="w-5 h-5 text-white" />
          </span>
        </div>
      </div>

      {showFullMap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setShowFullMap(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={map.image_url}
              alt="Campaign map — full size"
              className="w-full rounded-xl"
              style={{ maxHeight: '85vh', objectFit: 'contain' }}
            />
            <button
              type="button"
              onClick={() => setShowFullMap(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#282a2d] flex items-center justify-center hover:bg-[#3a3d42] transition-colors"
            >
              <X className="w-4 h-4 text-on-surface" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {STAGES.map((s, i) => {
          const done = i < stageIndex
          const active = i === stageIndex
          return (
            <div
              key={s.key}
              className={`rounded-xl p-5 flex items-start gap-4 transition-all ${
                active ? 'bg-[#1e2023] ring-1 ring-primary/30' : done ? 'bg-[#1a1c1f] opacity-70' : 'bg-[#1a1c1f] opacity-40'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-primary text-[#3f2e00]' : active ? 'bg-[#261a00] text-primary' : 'bg-[#282a2d] text-on-surface-variant'
              }`}>
                {done ? <Check className="w-4 h-4" /> : s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-manrope font-semibold text-on-surface">{s.label}</div>
                <div className="text-xs font-manrope text-on-surface-variant mt-0.5">{s.desc}</div>
                {done && i === 0 && (
                  <div className="text-xs font-manrope text-primary mt-1">{terrainAreaCount} terrain areas classified</div>
                )}
                {done && i === 1 && (
                  <div className="text-xs font-manrope text-primary mt-1">{resourcePointCount} resource points placed</div>
                )}

                {/* Sub-step progress — shown while terrain classification is running */}
                {active && showSubSteps && i === 0 && (
                  <div className="mt-3 space-y-2">
                    {subSteps.map((step, si) => (
                      <div key={si} className="flex items-start gap-2">
                        <div className="mt-0.5 flex-shrink-0">
                          {step.status === 'done' && <Check className="w-3.5 h-3.5 text-primary" />}
                          {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                          {step.status === 'skipped' && <SkipForward className="w-3.5 h-3.5 text-on-surface-variant" />}
                          {step.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-[#3a3d42]" />}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-manrope ${step.status === 'done' ? 'text-primary' : step.status === 'skipped' ? 'text-on-surface-variant' : step.status === 'running' ? 'text-on-surface' : 'text-on-surface-variant opacity-50'}`}>
                            {step.label}
                          </div>
                          {step.message && step.status !== 'pending' && (
                            <div className={`text-xs font-manrope mt-0.5 ${step.status === 'skipped' ? 'text-on-surface-variant' : 'text-on-surface-variant'}`}>
                              {step.message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {warning && !running && (
        <div className="mt-4 rounded-lg bg-[#332200]/60 border border-[#ffc637]/20 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-manrope text-on-surface">{warning}</p>
            <button
              type="button"
              onClick={runStage}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-manrope font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              <RefreshCw className="w-3 h-3" />
              Retry skipped steps
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg bg-[#93000a]/20 px-4 py-3 text-sm font-manrope text-[#ffb4ab]">
          {error}
        </div>
      )}

      <div className="mt-8">
        {currentStage === 'created' && terrainMode !== 'ai' ? (
          <TerrainModeSelector onSelect={(mode) => {
            if (mode === 'ai') setTerrainMode('ai')
            else setTerrainMode(mode)
          }} />
        ) : (
          <button
            type="button"
            onClick={runStage}
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
          >
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing map&hellip; This may take up to 60 seconds</>
            ) : (
              stageButtonLabel[currentStage]
            )}
          </button>
        )}
      </div>
    </div>
  )
}
