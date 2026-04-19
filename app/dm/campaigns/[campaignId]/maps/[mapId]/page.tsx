import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MapSetupWizard } from '@/components/dm/map-setup-wizard'
import { MapCanvas } from '@/components/dm/map-canvas'

export default async function MapViewPage({
  params,
}: {
  params: Promise<{ campaignId: string; mapId: string }>
}) {
  const { campaignId, mapId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: map, error: mapError } = await supabase
    .from('campaign_maps')
    .select('*')
    .eq('id', mapId)
    .eq('campaign_id', campaignId)
    .eq('dm_id', user.id)
    .single()

  if (mapError || !map) notFound()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('id', campaignId)
    .single()

  const [{ data: terrainAreas }, { data: resourcePoints }, { data: worldTowns }, { data: pois }] =
    await Promise.all([
      supabase
        .from('terrain_areas')
        .select('id, terrain_type, polygon, computed_elevation_m, climate_zone, temp_summer_high_c, temp_winter_low_c, annual_rainfall_mm, ecosystem_flora, ecosystem_fauna, hazards, atmosphere_text')
        .eq('map_id', mapId),
      supabase
        .from('resource_points')
        .select('id, x_pct, y_pct, resource_type, richness, influence_radius_pct, name, placed_by')
        .eq('map_id', mapId),
      supabase
        .from('world_towns')
        .select('id, x_pct, y_pct, name, town_tier, wealth_score, specializations')
        .eq('map_id', mapId),
      supabase
        .from('points_of_interest')
        .select('id, x_pct, y_pct, poi_type, poi_category, name, is_discovered, player_hint, description')
        .eq('map_id', mapId),
    ])

  const normalizedTerrainAreas = (terrainAreas ?? []).map(a => ({
    ...a,
    polygon: (a.polygon ?? []) as Array<{ x: number; y: number }>,
    hazards: a.hazards as Array<{ type: string; season: string; probability: string }> | null,
  }))

  const normalizedResourcePoints = (resourcePoints ?? [])
    .filter(r => r.influence_radius_pct != null)
    .map(r => ({ ...r, influence_radius_pct: r.influence_radius_pct! }))

  const normalizedPois = (pois ?? []).map(p => ({
    ...p,
    is_discovered: p.is_discovered ?? false,
  }))

  if (map.setup_stage !== 'ready') {
    return (
      <MapSetupWizard
        map={map}
        campaignId={campaignId}
        campaignName={campaign?.name ?? ''}
        terrainAreaCount={normalizedTerrainAreas.length}
        resourcePointCount={normalizedResourcePoints.length}
      />
    )
  }

  return (
    <MapCanvas
      map={map}
      campaignId={campaignId}
      campaignName={campaign?.name ?? ''}
      terrainAreas={normalizedTerrainAreas}
      resourcePoints={normalizedResourcePoints}
      worldTowns={worldTowns ?? []}
      pois={normalizedPois}
    />
  )
}
