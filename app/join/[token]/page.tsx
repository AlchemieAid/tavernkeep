import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface JoinCampaignPageProps {
  params: {
    token: string
  }
}

export default async function JoinCampaignPage({ params }: JoinCampaignPageProps) {
  const supabase = await createClient()
  const { token } = params

  // Get campaign by invite token
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, description, dm_id')
    .eq('invite_token', token)
    .single()

  if (campaignError || !campaign) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invite</CardTitle>
            <CardDescription>
              This campaign invite link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/player/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in - redirect to player login with return URL
    redirect(`/player/login?redirect=/join/${token}`)
  }

  // Get player profile
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!player) {
    // No player profile - redirect to profile creation with return URL
    redirect(`/player/profile/create?redirect=/join/${token}`)
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from('campaign_members')
    .select('id, is_active')
    .eq('campaign_id', campaign.id)
    .eq('player_id', player.id)
    .single()

  if (existingMembership) {
    if (existingMembership.is_active) {
      // Already an active member - redirect to campaign
      redirect(`/player/campaigns/${campaign.id}`)
    } else {
      // Membership exists but inactive - reactivate it
      await supabase
        .from('campaign_members')
        .update({ is_active: true, last_active_at: new Date().toISOString() })
        .eq('id', existingMembership.id)

      redirect(`/player/campaigns/${campaign.id}`)
    }
  }

  // Create new membership
  const { error: membershipError } = await supabase
    .from('campaign_members')
    .insert({
      campaign_id: campaign.id,
      player_id: player.id,
      invited_by: campaign.dm_id,
    })

  if (membershipError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Joining Campaign</CardTitle>
            <CardDescription>
              {membershipError.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/player/campaigns">Go to My Campaigns</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Successfully joined - redirect to campaign with character creation prompt
  redirect(`/player/campaigns/${campaign.id}/characters/new`)
}
