import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Map, ChevronLeft } from 'lucide-react'

interface PlayerMapsPageProps {
  params: Promise<{ campaignId: string }>
}

export default async function PlayerMapsPage({ params }: PlayerMapsPageProps) {
  const { campaignId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/player/login')

  const { data: player } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single()
  if (!player) redirect('/player/profile/create')

  const { data: membership } = await supabase
    .from('campaign_members')
    .select('id, is_active')
    .eq('campaign_id', campaignId)
    .eq('player_id', player.id)
    .single()
  if (!membership?.is_active) redirect('/player/campaigns')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .single()

  const { data: maps } = await supabase
    .from('campaign_maps')
    .select('id, image_url, map_size, map_style, setup_stage')
    .eq('campaign_id', campaignId)
    .eq('setup_stage', 'ready')
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-[#111316] font-manrope">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/player/campaigns/${campaignId}`}
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {campaign?.name ?? 'Campaign'}
        </Link>

        <h1 className="text-2xl font-bold text-on-surface mb-2">Campaign Maps</h1>
        <p className="text-on-surface-variant text-sm mb-8">Explore the world your party inhabits.</p>

        {!maps || maps.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant">
            <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No maps available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {maps.map(m => (
              <Link
                key={m.id}
                href={`/player/campaigns/${campaignId}/maps/${m.id}`}
                className="group relative rounded-2xl overflow-hidden border border-[#282a2d] hover:border-primary/40 transition-all"
                style={{ aspectRatio: '16/9' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.image_url}
                  alt="Map"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-white capitalize">
                      {m.map_style?.replace(/_/g, ' ') ?? m.map_size}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5 capitalize">{m.map_size} scale</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
