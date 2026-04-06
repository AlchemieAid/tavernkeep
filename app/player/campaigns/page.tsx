import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function PlayerCampaignsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/player/login')
  }

  // Get player profile
  const { data: player } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single()

  if (!player) {
    redirect('/player/profile/create')
  }

  // Get campaigns the player is a member of
  const { data: memberships } = await supabase
    .from('campaign_members')
    .select(`
      id,
      joined_at,
      is_active,
      campaign:campaigns (
        id,
        name,
        description,
        slug
      )
    `)
    .eq('player_id', player.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })

  return (
    <main className="min-h-screen p-6 bg-surface">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="headline-lg text-gold">My Campaigns</h1>
            <p className="body-md text-muted mt-2">
              Welcome back, {player.display_name}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/player/profile">Profile Settings</Link>
          </Button>
        </div>

        {!memberships || memberships.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Campaigns Yet</CardTitle>
              <CardDescription>
                You haven't joined any campaigns yet. Ask your DM for an invite link or QR code to get started!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {memberships.map((membership: any) => (
              <Card key={membership.id} className="hover:border-gold transition-colors">
                <CardHeader>
                  <CardTitle>{membership.campaign.name}</CardTitle>
                  {membership.campaign.description && (
                    <CardDescription>{membership.campaign.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/player/campaigns/${membership.campaign.id}`}>
                      View Campaign
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Join a Campaign</CardTitle>
            <CardDescription>
              Have an invite link or QR code from your DM? Click below to join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/join">Enter Invite Code</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
