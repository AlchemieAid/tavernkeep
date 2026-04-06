import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PlayerCampaignPageProps {
  params: {
    campaignId: string
  }
}

export default async function PlayerCampaignPage({ params }: PlayerCampaignPageProps) {
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

  // Verify campaign membership
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('id, is_active')
    .eq('campaign_id', params.campaignId)
    .eq('player_id', player.id)
    .single()

  if (!membership || !membership.is_active) {
    redirect('/player/campaigns')
  }

  // Get campaign details
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, description')
    .eq('id', params.campaignId)
    .single()

  if (!campaign) {
    redirect('/player/campaigns')
  }

  // Get player's characters in this campaign
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, avatar_url')
    .eq('player_id', player.id)
    .eq('campaign_id', params.campaignId)
    .order('created_at', { ascending: true })

  // Get revealed towns (RLS policy filters automatically)
  const { data: towns } = await supabase
    .from('towns')
    .select('id, name, description, size, location')
    .eq('campaign_id', params.campaignId)
    .eq('is_revealed', true)
    .order('name', { ascending: true })

  return (
    <main className="min-h-screen p-6 bg-surface">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="headline-lg text-gold">{campaign.name}</h1>
            {campaign.description && (
              <p className="body-md text-muted mt-2">{campaign.description}</p>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href="/player/campaigns">← Back to Campaigns</Link>
          </Button>
        </div>

        {/* Characters Section */}
        <div>
          <h2 className="headline-sm text-on-surface mb-4">Your Characters</h2>
          {!characters || characters.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Characters Yet</CardTitle>
                <CardDescription>
                  Create your first character to start playing in this campaign.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`/player/campaigns/${params.campaignId}/characters/new`}>
                    Create Character
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <Card key={character.id} className="hover:border-gold transition-colors">
                  <CardHeader>
                    <CardTitle>{character.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/player/campaigns/${params.campaignId}/characters/${character.id}`}>
                        View Character
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>New Character</CardTitle>
                  <CardDescription>Create another character for this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/player/campaigns/${params.campaignId}/characters/new`}>
                      Create Character
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Towns Section */}
        <div>
          <h2 className="headline-sm text-on-surface mb-4">Explore Towns</h2>
          {!towns || towns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-lg text-muted">
                  No towns have been revealed yet. Your DM will reveal locations as you explore the world.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {towns.map((town) => (
                <Card key={town.id} className="hover:border-gold transition-colors">
                  <CardHeader>
                    <CardTitle>{town.name}</CardTitle>
                    {town.description && (
                      <CardDescription className="line-clamp-2">{town.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(town.size || town.location) && (
                      <p className="text-sm text-muted">
                        {town.size && <span className="capitalize">{town.size}</span>}
                        {town.size && town.location && <span> · </span>}
                        {town.location && <span className="capitalize">{town.location.replace('_', ' ')}</span>}
                      </p>
                    )}
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/player/campaigns/${params.campaignId}/towns/${town.id}`}>
                        Explore Town
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
