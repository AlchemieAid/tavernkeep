import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlayerMapCanvas } from '@/components/player/player-map-canvas'

interface PlayerMapPageProps {
  params: Promise<{ campaignId: string; mapId: string }>
}

export default async function PlayerMapPage({ params }: PlayerMapPageProps) {
  const { campaignId, mapId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/player/login')

  const { data: player } = await supabase
    .from('players')
    .select('id')
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

  const { data: map } = await supabase
    .from('campaign_maps')
    .select('id, image_url, map_size, map_style, setup_stage')
    .eq('id', mapId)
    .eq('campaign_id', campaignId)
    .eq('setup_stage', 'ready')
    .single()

  if (!map) redirect(`/player/campaigns/${campaignId}/maps`)

  const [
    { data: worldTowns },
    { data: pois },
    { data: territories },
    { data: historicalEvents },
    { data: tradeRoutes },
  ] = await Promise.all([
    supabase
      .from('world_towns')
      .select('id, x_pct, y_pct, name, town_tier, wealth_score, specializations, shop_id')
      .eq('map_id', mapId),
    supabase
      .from('points_of_interest')
      .select('id, x_pct, y_pct, poi_type, name, player_hint, is_discovered')
      .eq('map_id', mapId),
    supabase
      .from('political_territories')
      .select('id, name, faction, color, polygon, law_level, attitude_to_strangers')
      .eq('map_id', mapId),
    supabase
      .from('historical_events')
      .select('id, x_pct, y_pct, event_name, event_type, years_ago')
      .eq('map_id', mapId)
      .eq('is_known_to_players', true),
    supabase
      .from('trade_routes')
      .select('id, town_a_id, town_b_id, primary_goods, trade_volume')
      .eq('map_id', mapId),
  ])

  return (
    <PlayerMapCanvas
      map={map}
      campaignId={campaignId}
      campaignName={campaign?.name ?? 'Campaign'}
      worldTowns={(worldTowns ?? []).map(t => ({
        ...t,
        shop_id: t.shop_id ?? null,
      }))}
      pois={(pois ?? []).map(p => ({
        ...p,
        name: p.name ?? null,
        player_hint: p.player_hint ?? null,
        is_discovered: p.is_discovered ?? false,
      }))}
      territories={(territories ?? []).map(t => ({
        ...t,
        faction: t.faction ?? null,
        color: t.color ?? null,
        polygon: (t.polygon ?? []) as Array<{ x: number; y: number }>,
        law_level: t.law_level ?? null,
        attitude_to_strangers: t.attitude_to_strangers ?? null,
      }))}
      historicalEvents={(historicalEvents ?? []).map(e => ({
        ...e,
        event_type: e.event_type ?? null,
        years_ago: e.years_ago ?? null,
      }))}
      tradeRoutes={(tradeRoutes ?? []).map(r => ({
        ...r,
        primary_goods: r.primary_goods ?? null,
        trade_volume: r.trade_volume ?? null,
      }))}
    />
  )
}
