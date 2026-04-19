/**
 * New Campaign Wizard Page
 * @page /dm/newcampaign
 * @auth Required - DM
 * @description Unified campaign creation workflow: setting definition → map generation → world building
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewCampaignWizard } from '@/components/dm/new-campaign-wizard'

export const metadata = {
  title: 'Create New Campaign | TavernKeep',
  description: 'Forge a new world from the void',
}

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    await supabase.from('profiles').insert({
      id: user.id,
      display_name: user.email?.split('@')[0] ?? 'DM',
      avatar_url: user.user_metadata?.avatar_url,
    })
  }

  return (
    <main className="min-h-screen bg-[#0c0e11]">
      <NewCampaignWizard />
    </main>
  )
}
