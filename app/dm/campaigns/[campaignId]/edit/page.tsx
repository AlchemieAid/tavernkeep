import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CampaignEditForm } from '@/components/dm/campaign-edit-form'

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('dm_id', user.id)
    .single()

  if (error || !campaign) {
    notFound()
  }

  return <CampaignEditForm campaign={campaign} />
}
