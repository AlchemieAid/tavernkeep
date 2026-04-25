import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, Map } from 'lucide-react'

export default async function MapsArchivePage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('id', campaignId)
    .eq('dm_id', user.id)
    .single()

  if (error || !campaign) notFound()

  const { data: allMaps } = await supabase
    .from('campaign_maps')
    .select('id, image_url, map_size, map_style, creation_method, is_selected, setup_stage, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#111316] px-6 py-8 max-w-6xl mx-auto">
      <nav className="flex items-center gap-2 text-sm font-manrope text-on-surface-variant mb-10">
        <Link href="/dm/dashboard" className="hover:text-primary transition-colors">Campaigns</Link>
        <span className="text-outline">/</span>
        <Link href={`/dm/campaigns/${campaignId}`} className="hover:text-primary transition-colors">
          {campaign.name}
        </Link>
        <span className="text-outline">/</span>
        <Link href={`/dm/campaigns/${campaignId}/maps`} className="hover:text-primary transition-colors">Maps</Link>
        <span className="text-outline">/</span>
        <span className="text-on-surface">Archives</span>
      </nav>

      <Link
        href={`/dm/campaigns/${campaignId}/maps`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8 font-manrope"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Maps
      </Link>

      <div className="mb-8">
        <h1 className="font-noto-serif text-3xl font-semibold text-on-surface">Map Archives</h1>
        <p className="mt-2 text-sm font-manrope text-on-surface-variant">
          All maps for <span className="text-on-surface">{campaign.name}</span>
        </p>
      </div>

      {!allMaps?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Map className="w-12 h-12 text-on-surface-variant opacity-20" />
          <p className="text-on-surface-variant font-manrope text-sm">No maps yet.</p>
          <Link
            href={`/dm/campaigns/${campaignId}/maps`}
            className="text-sm font-manrope text-primary hover:underline"
          >
            Create your first map
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allMaps.map(m => (
            <Link
              key={m.id}
              href={`/dm/campaigns/${campaignId}/maps/${m.id}`}
              className="group relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all"
              style={{ aspectRatio: '1 / 1' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.image_url}
                alt={`${m.map_size} map`}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {m.is_selected && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-[#3f2e00] text-[9px] font-bold uppercase tracking-wide">
                  Active
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
                <p className="text-xs font-manrope font-semibold text-white capitalize">
                  {m.map_style?.replace(/_/g, ' ') ?? m.map_size}
                </p>
                <p className="text-[10px] font-manrope text-white/60 flex items-center gap-1">
                  {m.creation_method === 'ai' ? '✦ AI Generated' : '↑ Uploaded'}
                  {m.setup_stage !== 'ready' && (
                    <span className="ml-1 px-1 py-0.5 rounded bg-amber-500/80 text-black text-[8px] font-bold">
                      Setup
                    </span>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
