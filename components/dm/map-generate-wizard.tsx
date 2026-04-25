'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Sparkles, Check, Loader2, X, Maximize2 } from 'lucide-react'

interface MapGenerateWizardProps {
  campaignId: string
  campaignName: string
  existingAiMapCount: number
}

const MAX_AI_GENERATIONS = 3

const MAP_STYLES = [
  { value: 'fantasy_painted', label: 'Fantasy Painted', desc: 'Lush, illustrated' },
  { value: 'parchment', label: 'Parchment', desc: 'Old World scroll' },
  { value: 'hand_drawn', label: 'Hand Drawn', desc: 'Ink & pencil' },
  { value: 'topographic', label: 'Topographic', desc: 'Elevation lines' },
] as const

const MAP_SIZES = [
  { value: 'region', label: 'Region', desc: '~500 mi' },
  { value: 'kingdom', label: 'Kingdom', desc: '~2,000 mi' },
  { value: 'continent', label: 'Continent', desc: '~8,000 mi' },
] as const

const BIOMES = [
  { value: 'temperate', label: 'Temperate Forest' },
  { value: 'arctic', label: 'Arctic Tundra' },
  { value: 'tropical', label: 'Tropical Jungle' },
  { value: 'desert', label: 'Desert Wasteland' },
  { value: 'archipelago', label: 'Oceanic Archipelago' },
  { value: 'volcanic', label: 'Volcanic Badlands' },
] as const

type Step = 'configure' | 'generating' | 'select'

interface GeneratedMap {
  id: string
  image_url: string
  map_size: string
  map_style: string | null
  biome_profile: string | null
  is_selected: boolean
}

interface MapGenerateWizardState {
  map_style: 'fantasy_painted' | 'parchment' | 'hand_drawn' | 'topographic'
  map_size: 'region' | 'kingdom' | 'continent'
  biome_profile: string
  dm_description: string
}

export function MapGenerateWizard({ campaignId, campaignName, existingAiMapCount }: MapGenerateWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('configure')
  const [form, setForm] = useState<MapGenerateWizardState>({
    map_style: 'fantasy_painted',
    map_size: 'region',
    biome_profile: 'temperate',
    dm_description: '',
  })
  const [generatedMaps, setGeneratedMaps] = useState<GeneratedMap[]>([])
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [previewMap, setPreviewMap] = useState<GeneratedMap | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)

  const remainingGenerations = MAX_AI_GENERATIONS - existingAiMapCount
  const canGenerate = remainingGenerations > 0

  async function handleGenerate() {
    if (!canGenerate) return
    setError(null)
    setStep('generating')

    const res = await fetch('/api/world/generate-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        map_style: form.map_style,
        map_size: form.map_size,
        biome_profile: form.biome_profile,
        dm_description: form.dm_description || undefined,
        count: 3,
      }),
    })

    const json = await res.json()

    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Generation failed')
      setStep('configure')
      return
    }

    setGeneratedMaps(json.data)
    setStep('select')
  }

  async function handleSelect() {
    if (!selectedMapId) return
    setSelecting(true)
    setError(null)

    const res = await fetch(`/api/world/generate-maps`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ map_id: selectedMapId, campaign_id: campaignId }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Failed to select map')
      setSelecting(false)
      return
    }

    router.push(`/dm/campaigns/${campaignId}`)
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'configure', label: 'Configure' },
    { key: 'generating', label: 'Generate' },
    { key: 'select', label: 'Select' },
  ]

  const stepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen bg-[#111316] px-6 py-8 max-w-5xl mx-auto">
      <Link
        href={`/dm/campaigns/${campaignId}/maps`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8 font-manrope"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {campaignName}
      </Link>

      <div className="flex items-center justify-center gap-0 mb-12">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-manrope font-semibold transition-all ${
                  i < stepIndex
                    ? 'bg-primary text-[#3f2e00]'
                    : i === stepIndex
                    ? 'text-primary ring-2 ring-primary bg-transparent'
                    : 'bg-[#282a2d] text-on-surface-variant'
                }`}
              >
                {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`mt-2 text-xs font-manrope ${i === stepIndex ? 'text-primary' : 'text-on-surface-variant'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-24 h-px mx-2 mb-4 ${i < stepIndex ? 'bg-primary' : 'bg-[#282a2d]'}`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 'configure' && (
        <div
          className="rounded-xl p-8 max-w-2xl mx-auto space-y-8"
          style={{
            background: '#1a1c1f',
            boxShadow: 'inset 0 1px 0 rgba(255,198,55,0.05), 0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div>
            <h1 className="font-noto-serif text-2xl text-on-surface mb-1">Configure Your Map</h1>
            <p className="text-sm font-manrope text-on-surface-variant">
              {remainingGenerations > 0
                ? `${remainingGenerations} generation${remainingGenerations !== 1 ? 's' : ''} remaining for this campaign`
                : 'You have reached the 3-map generation limit for this campaign'}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-[#93000a]/20 px-4 py-3 text-sm font-manrope text-[#ffb4ab]">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-manrope font-semibold text-on-surface-variant uppercase tracking-wider">
              Map Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MAP_STYLES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, map_style: opt.value }))}
                  className={`p-3 rounded-lg text-left transition-all font-manrope ${
                    form.map_style === opt.value
                      ? 'ring-1 ring-primary bg-[#261a00]'
                      : 'bg-[#282a2d] hover:bg-[#333538]'
                  }`}
                >
                  <div className="text-sm font-semibold text-on-surface">{opt.label}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-manrope font-semibold text-on-surface-variant uppercase tracking-wider">
              Map Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MAP_SIZES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, map_size: opt.value }))}
                  className={`p-3 rounded-lg text-left transition-all font-manrope ${
                    form.map_size === opt.value
                      ? 'ring-1 ring-primary bg-[#261a00]'
                      : 'bg-[#282a2d] hover:bg-[#333538]'
                  }`}
                >
                  <div className="text-sm font-semibold text-on-surface">{opt.label}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-manrope font-semibold text-on-surface-variant uppercase tracking-wider">
              Dominant Biome
            </label>
            <select
              value={form.biome_profile}
              onChange={e => setForm(f => ({ ...f, biome_profile: e.target.value }))}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-manrope text-on-surface bg-[#0c0e11] outline-none focus:ring-1 focus:ring-primary transition-all"
            >
              {BIOMES.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-manrope font-semibold text-on-surface-variant uppercase tracking-wider">
              Describe Your World
              <span className="ml-2 text-on-surface-variant/50 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              rows={4}
              value={form.dm_description}
              onChange={e => setForm(f => ({ ...f, dm_description: e.target.value }))}
              placeholder="Mountains to the north, ancient forest in the center, cursed swamps to the south..."
              className="w-full rounded-lg px-4 py-3 text-sm font-manrope text-on-surface bg-[#0c0e11] outline-none focus:ring-1 focus:ring-primary transition-all resize-none placeholder:text-on-surface-variant/40"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href={`/dm/campaigns/${campaignId}/maps`}
              className="text-sm font-manrope text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
            >
              <Sparkles className="w-4 h-4" />
              Generate 3 Maps
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="font-noto-serif text-2xl text-on-surface mb-2">Conjuring Your World&hellip;</h2>
            <p className="text-sm font-manrope text-on-surface-variant">
              DALL-E 3 is painting 3 unique maps. This takes about 30–45 seconds.
            </p>
          </div>
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-8 max-w-5xl mx-auto">
          <div>
            <h1 className="font-noto-serif text-2xl text-on-surface mb-1">Choose Your Map</h1>
            <p className="text-sm font-manrope text-on-surface-variant">
              Select the map that best captures your world. AI will then classify terrain and model your economy.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-[#93000a]/20 px-4 py-3 text-sm font-manrope text-[#ffb4ab]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedMaps.map((m, i) => (
              <div key={m.id} className="relative">
                <button
                  type="button"
                  onClick={() => setPreviewMap(m)}
                  className={`relative w-full rounded-xl overflow-hidden aspect-square transition-all group ${
                    selectedMapId === m.id
                      ? 'ring-2 ring-primary'
                      : 'ring-1 ring-transparent hover:ring-[#4d4635]'
                  }`}
                  style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image_url}
                    alt={`Generated map variant ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e11]/80 via-transparent to-transparent" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <span className="text-xs font-manrope font-semibold text-on-surface">
                      Variant {i + 1} · Click to preview
                    </span>
                    {selectedMapId === m.id && (
                      <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-[#3f2e00]" />
                      </span>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('configure')}
              className="text-sm font-manrope text-on-surface-variant hover:text-on-surface transition-colors"
            >
              ← Reconfigure
            </button>
            <button
              type="button"
              onClick={handleSelect}
              disabled={!selectedMapId || selecting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
            >
              {selecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Use This Map
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen preview modal */}
      {previewMap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setPreviewMap(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewMap.image_url}
              alt="Map preview"
              className="w-full rounded-xl"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
            <button
              type="button"
              onClick={() => setPreviewMap(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#282a2d] flex items-center justify-center hover:bg-[#3a3d42] transition-colors"
            >
              <X className="w-4 h-4 text-on-surface" />
            </button>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-manrope text-on-surface-variant">
                Variant {generatedMaps.findIndex(m => m.id === previewMap.id) + 1} — {previewMap.map_style?.replace(/_/g, ' ')} · {previewMap.map_size}
              </p>
              <button
                type="button"
                onClick={() => { setSelectedMapId(previewMap.id); setPreviewMap(null) }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-manrope font-semibold text-sm text-[#3f2e00] transition-opacity hover:opacity-90"
                style={{ background: selectedMapId === previewMap.id ? 'rgba(255,198,55,0.5)' : 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
              >
                {selectedMapId === previewMap.id ? (
                  <><Check className="w-4 h-4" /> Selected</>
                ) : (
                  <><Check className="w-4 h-4" /> Select this map</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
