'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Layers, TreePine, Check, MapPin } from 'lucide-react'

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
  { key: 'created', label: 'Classify Terrain', desc: 'AI reads the map image and identifies terrain polygons (plains, mountains, rivers, etc.)', icon: <Layers className="w-5 h-5" /> },
  { key: 'terrain_classified', label: 'Place Resources', desc: 'AI places resource points based on terrain — iron in mountains, fish at coasts, farmland in valleys.', icon: <TreePine className="w-5 h-5" /> },
  { key: 'resources_placed', label: 'Generate Atmosphere', desc: 'AI writes sensory read-aloud text for each terrain area. Your DM read-aloud is ready.', icon: <MapPin className="w-5 h-5" /> },
]

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

  async function runStage() {
    setRunning(true)
    setError(null)

    try {
      if (currentStage === 'created') {
        const res = await fetch('/api/world/classify-terrain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ map_id: map.id, image_url: map.image_url }),
        })
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Terrain classification failed')
        // classify-terrain already sets setup_stage = 'terrain_classified' — no further call needed
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
  const currentStageDef = STAGES[stageIndex]

  const stageButtonLabel: Record<Stage, string> = {
    created: `Classify Terrain with AI`,
    terrain_classified: `Place ${terrainAreaCount} Terrain Areas — Generate Resources`,
    resources_placed: `Generate Atmosphere & Finish Setup`,
  }

  return (
    <div className="min-h-screen bg-[#111316] px-6 py-8 max-w-3xl mx-auto">
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

      <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={map.image_url}
          alt="Campaign map"
          className="w-full max-h-64 object-cover opacity-70"
        />
      </div>

      <div className="mt-8 space-y-4">
        {STAGES.map((s, i) => {
          const done = i < stageIndex
          const active = i === stageIndex
          return (
            <div
              key={s.key}
              className={`rounded-xl p-5 flex items-start gap-4 transition-all ${
                active
                  ? 'bg-[#1e2023] ring-1 ring-primary/30'
                  : done
                  ? 'bg-[#1a1c1f] opacity-70'
                  : 'bg-[#1a1c1f] opacity-40'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-primary text-[#3f2e00]' : active ? 'bg-[#261a00] text-primary' : 'bg-[#282a2d] text-on-surface-variant'
              }`}>
                {done ? <Check className="w-4 h-4" /> : s.icon}
              </div>
              <div>
                <div className="text-sm font-manrope font-semibold text-on-surface">{s.label}</div>
                <div className="text-xs font-manrope text-on-surface-variant mt-0.5">{s.desc}</div>
                {done && i === 0 && (
                  <div className="text-xs font-manrope text-primary mt-1">{terrainAreaCount} terrain areas classified</div>
                )}
                {done && i === 1 && (
                  <div className="text-xs font-manrope text-primary mt-1">{resourcePointCount} resource points placed</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-[#93000a]/20 px-4 py-3 text-sm font-manrope text-[#ffb4ab]">
          {error}
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={runStage}
          disabled={running}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
        >
          {running ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Working&hellip; This may take 30–60 seconds</>
          ) : (
            stageButtonLabel[currentStage]
          )}
        </button>
      </div>
    </div>
  )
}
