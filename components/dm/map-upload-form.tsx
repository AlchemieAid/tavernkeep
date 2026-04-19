'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Upload, ImageIcon, X, Loader2, Check } from 'lucide-react'

interface MapUploadFormProps {
  campaignId: string
  campaignName: string
}

const MAP_SIZES = [
  { value: 'region', label: 'Region', desc: '~500 mi' },
  { value: 'kingdom', label: 'Kingdom', desc: '~2,000 mi' },
  { value: 'continent', label: 'Continent', desc: '~8,000 mi' },
] as const

const MAP_STYLES = [
  { value: 'fantasy_painted', label: 'Fantasy Painted' },
  { value: 'parchment', label: 'Parchment' },
  { value: 'hand_drawn', label: 'Hand Drawn' },
  { value: 'topographic', label: 'Topographic' },
  { value: null, label: 'Other / Unknown' },
] as const

export function MapUploadForm({ campaignId, campaignName }: MapUploadFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mapSize, setMapSize] = useState<'region' | 'kingdom' | 'continent'>('region')
  const [mapStyle, setMapStyle] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  function handleFile(f: File) {
    if (!f.type.startsWith('image/')) {
      setError('Only image files are supported (PNG, JPG, WEBP)')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB')
      return
    }
    setError(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)

    const meta = JSON.stringify({
      campaign_id: campaignId,
      map_size: mapSize,
      map_style: mapStyle,
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('meta', meta)

    const res = await fetch('/api/world/upload-map', {
      method: 'POST',
      body: formData,
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message ?? 'Upload failed')
      setUploading(false)
      return
    }

    router.push(`/dm/campaigns/${campaignId}/maps`)
  }

  return (
    <div className="min-h-screen bg-[#111316] px-6 py-8 max-w-3xl mx-auto">
      <Link
        href={`/dm/campaigns/${campaignId}/maps`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8 font-manrope"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {campaignName}
      </Link>

      <div className="mb-8">
        <h1 className="font-noto-serif text-3xl text-on-surface mb-2">Upload Your Map</h1>
        <p className="text-sm font-manrope text-on-surface-variant">
          Upload a PNG or JPG. Once uploaded, AI will classify the terrain automatically.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-[#93000a]/20 px-4 py-3 text-sm font-manrope text-[#ffb4ab]">
          {error}
        </div>
      )}

      <div
        className="rounded-xl p-8 space-y-8"
        style={{
          background: '#1a1c1f',
          boxShadow: 'inset 0 1px 0 rgba(255,198,55,0.05), 0 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center py-16 px-6 gap-4 ${
            dragActive
              ? 'border-primary bg-[#261a00]/30'
              : 'border-[#4d4635]/40 hover:border-[#4d4635]/80'
          }`}
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <div className="relative w-full max-h-64 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Map preview"
                className="max-h-64 rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setFile(null)
                  setPreview(null)
                }}
                className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#282a2d] flex items-center justify-center hover:bg-[#333538] transition-colors"
              >
                <X className="w-3.5 h-3.5 text-on-surface-variant" />
              </button>
            </div>
          ) : (
            <>
              {dragActive
                ? <Upload className="w-10 h-10 text-primary" />
                : <ImageIcon className="w-10 h-10 text-on-surface-variant" />
              }
              <div className="text-center">
                <p className="text-sm font-manrope font-semibold text-on-surface">
                  {dragActive ? 'Drop it here' : 'Drag & drop or click to browse'}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">PNG, JPG, WEBP — max 10 MB</p>
              </div>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </div>

        {file && (
          <p className="text-xs font-manrope text-on-surface-variant -mt-4">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-manrope font-semibold text-on-surface-variant uppercase tracking-wider">
            Map Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MAP_SIZES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMapSize(opt.value)}
                className={`p-3 rounded-lg text-left transition-all font-manrope ${
                  mapSize === opt.value
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
            Map Style
            <span className="ml-2 text-on-surface-variant/50 normal-case font-normal">(optional)</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {MAP_STYLES.map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setMapStyle(opt.value ?? null)}
                className={`p-3 rounded-lg text-left transition-all font-manrope ${
                  mapStyle === opt.value
                    ? 'ring-1 ring-primary bg-[#261a00]'
                    : 'bg-[#282a2d] hover:bg-[#333538]'
                }`}
              >
                <div className="text-sm text-on-surface">{opt.label}</div>
              </button>
            ))}
          </div>
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
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-manrope font-semibold text-sm text-[#3f2e00] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading&hellip;</>
              : <><Check className="w-4 h-4" /> Upload Map</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
