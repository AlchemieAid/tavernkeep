import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, Sparkles, Upload, Clock, Layers, Wand2 } from 'lucide-react'

export default async function MapCreationRouterPage({
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

  const { data: recentMaps } = await supabase
    .from('campaign_maps')
    .select('id, image_url, map_size, creation_method, is_selected, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(4)

  return (
    <div className="min-h-screen bg-[#111316] px-6 py-8 max-w-6xl mx-auto">
      <nav className="flex items-center gap-2 text-sm font-manrope text-on-surface-variant mb-10">
        <Link href="/dm/dashboard" className="hover:text-primary transition-colors">Campaigns</Link>
        <span className="text-outline">/</span>
        <Link href={`/dm/campaigns/${campaignId}`} className="hover:text-primary transition-colors">
          {campaign.name}
        </Link>
        <span className="text-outline">/</span>
        <span className="text-on-surface">Maps</span>
      </nav>

      <Link
        href={`/dm/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8 font-manrope"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Campaign
      </Link>

      <div className="mb-12">
        <h1 className="font-noto-serif text-4xl font-semibold text-on-surface leading-tight">
          Cartographer&apos;s Sanctum
        </h1>
        <p className="mt-3 text-on-surface-variant font-manrope max-w-xl">
          Choose the genesis of your world&apos;s topography. Whether conjured from the void or brought from your archives, every map tells a legend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div
          className="rounded-xl p-8 flex flex-col gap-6"
          style={{
            background: '#1a1c1f',
            boxShadow: 'inset 0 1px 0 rgba(255,198,55,0.05), 0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#261a00] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-noto-serif text-2xl text-on-surface">Generate with AI</h2>
          </div>

          <p className="text-on-surface-variant font-manrope text-sm leading-relaxed">
            Describe your world and DALL-E 3 generates 3 unique map options for you to choose from.
            AI then classifies terrain, places resources, and models your economy automatically.
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { icon: <Layers className="w-3 h-3" />, label: '3 variants' },
              { icon: <Clock className="w-3 h-3" />, label: '~45 seconds' },
              { icon: <Wand2 className="w-3 h-3" />, label: 'DALL-E 3' },
            ].map(tag => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-manrope font-medium text-primary bg-[#261a00]"
              >
                {tag.icon}
                {tag.label}
              </span>
            ))}
          </div>

          <Link
            href={`/dm/campaigns/${campaignId}/maps/generate`}
            className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-manrope font-semibold text-sm text-[#3f2e00] transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ffc637 0%, #e2aa00 100%)' }}
          >
            <Sparkles className="w-4 h-4" />
            Generate Map
          </Link>
        </div>

        <div
          className="rounded-xl p-8 flex flex-col gap-6"
          style={{
            background: '#1a1c1f',
            boxShadow: 'inset 0 1px 0 rgba(255,198,55,0.05), 0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#1e2023] flex items-center justify-center">
              <Upload className="w-6 h-6 text-secondary" />
            </div>
            <h2 className="font-noto-serif text-2xl text-on-surface">Upload Your Map</h2>
          </div>

          <p className="text-on-surface-variant font-manrope text-sm leading-relaxed">
            Upload a PNG or JPG of your own map — hand-drawn, commissioned, or found online.
            AI will automatically classify terrain and place resource nodes.
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Your art' },
              { label: 'Any style' },
              { label: 'AI-assisted' },
            ].map(tag => (
              <span
                key={tag.label}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-manrope font-medium text-on-surface-variant bg-[#282a2d]"
              >
                {tag.label}
              </span>
            ))}
          </div>

          <Link
            href={`/dm/campaigns/${campaignId}/maps/upload`}
            className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-manrope font-semibold text-sm text-primary transition-colors hover:bg-[#282a2d]"
            style={{ border: '1px solid rgba(77,70,53,0.3)' }}
          >
            <Upload className="w-4 h-4" />
            Upload Map
          </Link>
        </div>
      </div>

      {recentMaps && recentMaps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-noto-serif text-xl text-on-surface">Recent Cartography</h3>
            <Link
              href={`/dm/campaigns/${campaignId}/maps/archives`}
              className="text-sm font-manrope text-on-surface-variant hover:text-primary transition-colors"
            >
              View All Archives
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recentMaps.map(m => (
              <Link key={m.id} href={`/dm/campaigns/${campaignId}/maps/${m.id}`}>
                <div
                  className="rounded-lg overflow-hidden aspect-square relative group"
                  style={{ background: '#1a1c1f' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image_url}
                    alt={`${m.map_size} map`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {m.is_selected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0c0e11] to-transparent p-2">
                    <p className="text-xs font-manrope text-on-surface-variant capitalize">
                      {m.creation_method === 'ai' ? '✦ AI' : '↑ Upload'} · {m.map_size}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
