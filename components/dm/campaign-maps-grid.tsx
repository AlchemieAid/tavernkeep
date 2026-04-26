'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MoreVertical, Maximize2, Settings, Trash2, CheckCircle2, Clock } from 'lucide-react'

interface CampaignMap {
  id: string
  image_url: string
  map_size: string
  creation_method: string
  is_selected: boolean | null
  setup_stage: string
  created_at: string | null
}

interface CampaignMapsGridProps {
  maps: CampaignMap[]
  campaignId: string
}

export function CampaignMapsGrid({ maps: initialMaps, campaignId }: CampaignMapsGridProps) {
  const router = useRouter()
  const [maps, setMaps] = useState(initialMaps)
  const [previewMap, setPreviewMap] = useState<CampaignMap | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CampaignMap | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/world/delete-map', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: deleteTarget.id }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setMaps(prev => prev.filter(m => m.id !== deleteTarget.id))
      setDeleteTarget(null)
      router.refresh()
    } catch {
      // keep dialog open on error
    } finally {
      setIsDeleting(false)
    }
  }

  if (maps.length === 0) return null

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-noto-serif text-xl text-on-surface">Your Maps</h3>
          <Link
            href={`/dm/campaigns/${campaignId}/maps/archives`}
            className="text-sm font-manrope text-on-surface-variant hover:text-primary transition-colors"
          >
            View All Archives
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {maps.map(m => {
            const isReady = m.setup_stage === 'ready'
            return (
              <div
                key={m.id}
                className="rounded-lg overflow-hidden relative group"
                style={{ background: '#1a1c1f' }}
              >
                {/* Thumbnail — click to expand */}
                <button
                  type="button"
                  className="block w-full aspect-square relative overflow-hidden focus:outline-none"
                  onClick={() => setPreviewMap(m)}
                  aria-label="Preview map"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image_url}
                    alt={`${m.map_size} map`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* expand hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                  {/* selected badge */}
                  {m.is_selected && (
                    <div className="absolute top-2 left-2">
                      <CheckCircle2 className="w-4 h-4 text-primary drop-shadow-sm" />
                    </div>
                  )}
                  {/* setup badge */}
                  {!isReady && (
                    <div className="absolute top-2 right-8 bg-[#261a00] rounded px-1.5 py-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-primary" />
                      <span className="text-[9px] font-manrope text-primary">Setup</span>
                    </div>
                  )}
                </button>

                {/* Bottom bar */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-[#0c0e11]">
                  <p className="text-[10px] font-manrope text-on-surface-variant capitalize truncate">
                    {m.creation_method === 'ai' ? '✦ AI' : '↑ Upload'} · {m.map_size}
                  </p>

                  {/* Kebab menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 transition-colors shrink-0"
                        aria-label="Map options"
                      >
                        <MoreVertical className="w-3 h-3 text-on-surface-variant" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem asChild>
                        <Link href={`/dm/campaigns/${campaignId}/maps/${m.id}`}>
                          <Settings className="w-3.5 h-3.5 mr-2" />
                          {isReady ? 'Open' : 'Setup'}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(m)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={!!previewMap} onOpenChange={open => { if (!open) setPreviewMap(null) }}>
        <DialogContent className="max-w-4xl p-2 bg-[#111316] border-[#282a2d]">
          <DialogHeader className="px-3 pt-2 pb-1">
            <DialogTitle className="font-noto-serif text-lg text-on-surface capitalize">
              {previewMap?.creation_method === 'ai' ? '✦ AI Generated' : '↑ Uploaded'} · {previewMap?.map_size}
            </DialogTitle>
          </DialogHeader>
          {previewMap && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewMap.image_url}
              alt="Map preview"
              className="w-full rounded object-contain max-h-[70vh]"
            />
          )}
          {previewMap && (
            <div className="flex gap-2 px-2 pb-2">
              <Link
                href={`/dm/campaigns/${campaignId}/maps/${previewMap.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-manrope font-semibold text-sm text-[#3f2e00]"
                style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
                onClick={() => setPreviewMap(null)}
              >
                <Settings className="w-4 h-4" />
                {previewMap.setup_stage === 'ready' ? 'Open Map' : 'Begin Setup'}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => { setPreviewMap(null); setDeleteTarget(previewMap) }}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open && !isDeleting) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm bg-[#111316] border-[#282a2d]">
          <DialogHeader>
            <DialogTitle className="font-noto-serif text-on-surface">Delete Map?</DialogTitle>
            <DialogDescription className="font-manrope">
              This permanently removes the map and all associated terrain, resources, towns, and POIs. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete Map'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
