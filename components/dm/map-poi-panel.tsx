'use client'

import { useState, useMemo } from 'react'
import { X, Search, Loader2, Check } from 'lucide-react'
import { POI_DEFINITIONS, type PoICategory } from '@/lib/world/poiDefinitions'

const CATEGORIES: PoICategory[] = [
  'settlement', 'military', 'arcane', 'dungeon',
  'religious', 'natural', 'ruin', 'infrastructure', 'wilderness',
]

export interface PlacedPoIResult {
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

interface MapPoIPanelProps {
  campaignId: string
  mapId: string
  onClose: () => void
  onPlaced: (poi: PlacedPoIResult) => void
}

type Step = 'select' | 'place'

export function MapPoIPanel({ campaignId, mapId, onClose, onPlaced }: MapPoIPanelProps) {
  const [step, setStep] = useState<Step>('select')
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<PoICategory | 'all'>('all')
  const [name, setName] = useState('')
  const [playerHint, setPlayerHint] = useState('')
  const [description, setDescription] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = POI_DEFINITIONS
    if (activeCategory !== 'all') list = list.filter(d => d.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d => d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
    }
    return list
  }, [search, activeCategory])

  const selectedDef = POI_DEFINITIONS.find(d => d.type === selectedType)

  async function handlePlace() {
    if (!selectedType) return
    setPlacing(true)
    setError(null)

    const res = await fetch('/api/world/place-poi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
        campaign_id: campaignId,
        poi_type: selectedType,
        poi_category: selectedDef?.category,
        name: name.trim() || null,
        player_hint: playerHint.trim() || null,
        description: description.trim() || null,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Failed to place PoI')
      setPlacing(false)
      return
    }

    onPlaced(json.data)
  }

  return (
    <div className="absolute inset-y-0 right-0 w-80 flex flex-col z-40" style={{
      background: 'rgba(14,16,19,0.97)',
      borderLeft: '1px solid rgba(255,198,55,0.1)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#282a2d]">
        <h2 className="font-manrope font-semibold text-sm text-on-surface">
          {step === 'select' ? 'Select PoI Type' : `Place ${selectedDef?.label}`}
        </h2>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {step === 'select' && (
        <>
          <div className="px-4 py-3 border-b border-[#282a2d] space-y-2">
            <div className="flex items-center gap-2 bg-[#1e2023] rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-on-surface-variant" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search PoI types..."
                className="flex-1 bg-transparent text-xs font-manrope text-on-surface placeholder:text-on-surface-variant outline-none"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all', ...CATEGORIES] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-manrope capitalize transition-all ${
                    activeCategory === cat
                      ? 'bg-primary/20 text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {filtered.map(def => (
              <button
                key={def.type}
                type="button"
                onClick={() => {
                  setSelectedType(def.type)
                  setStep('place')
                }}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-[#1e2023] transition-colors text-left"
              >
                <span className="text-lg leading-none mt-0.5">{def.icon}</span>
                <div>
                  <div className="text-xs font-manrope font-semibold text-on-surface">{def.label}</div>
                  <div className="text-[10px] font-manrope text-on-surface-variant mt-0.5 leading-relaxed">{def.description}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-xs font-manrope text-on-surface-variant text-center">No PoIs match your search</p>
            )}
          </div>
        </>
      )}

      {step === 'place' && selectedDef && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-4 py-4 space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedDef.icon}</span>
              <div>
                <div className="text-sm font-manrope font-semibold text-on-surface">{selectedDef.label}</div>
                <div className="text-xs font-manrope text-on-surface-variant capitalize">{selectedDef.category}</div>
              </div>
            </div>

            <p className="text-xs font-manrope text-on-surface-variant">{selectedDef.description}</p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-manrope font-semibold uppercase tracking-wider text-on-surface-variant">
                  Name <span className="normal-case font-normal text-on-surface-variant/50">(optional)</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={`The ${selectedDef.label}`}
                  className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs font-manrope text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-manrope font-semibold uppercase tracking-wider text-on-surface-variant">
                  Player hint <span className="normal-case font-normal text-on-surface-variant/50">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={playerHint}
                  onChange={e => setPlayerHint(e.target.value)}
                  placeholder="What players can discover here..."
                  className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs font-manrope text-on-surface outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-manrope font-semibold uppercase tracking-wider text-on-surface-variant">
                  DM notes <span className="normal-case font-normal text-on-surface-variant/50">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Private notes for you as DM..."
                  className="w-full bg-[#1e2023] rounded-lg px-3 py-2 text-xs font-manrope text-on-surface outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-[#93000a]/20 px-3 py-2 text-xs font-manrope text-[#ffb4ab]">{error}</div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-[#282a2d] flex gap-2">
            <button
              type="button"
              onClick={() => setStep('select')}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-manrope text-on-surface-variant hover:text-on-surface hover:bg-[#282a2d] transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePlace}
              disabled={placing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-manrope font-semibold text-[#3f2e00] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
            >
              {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Place on Map
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
