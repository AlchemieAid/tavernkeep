import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MapGenerateWizard } from '@/components/dm/map-generate-wizard'

export default async function MapGeneratePage({
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

  const { count: mapCount } = await supabase
    .from('campaign_maps')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('creation_method', 'ai')

  return (
    <MapGenerateWizard
      campaignId={campaignId}
      campaignName={campaign.name}
      existingAiMapCount={mapCount ?? 0}
    />
  )
}
