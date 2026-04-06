import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PlayerTownPageProps {
  params: {
    campaignId: string
    townId: string
  }
}

export default async function PlayerTownPage({ params }: PlayerTownPageProps) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/player/login')
  }

  // Get player profile
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!player) {
    redirect('/player/profile/create')
  }

  // Verify campaign membership
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('id')
    .eq('campaign_id', params.campaignId)
    .eq('player_id', player.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    redirect('/player/campaigns')
  }

  // Get town (RLS policy ensures it's revealed)
  const { data: town, error } = await supabase
    .from('towns')
    .select('id, name, description, population, size, location, ruler, political_system, history')
    .eq('id', params.townId)
    .eq('campaign_id', params.campaignId)
    .eq('is_revealed', true)
    .single()

  if (error || !town) {
    notFound()
  }

  // Get revealed shops in this town
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, shop_type, economic_tier, reputation, operating_hours')
    .eq('town_id', params.townId)
    .eq('is_revealed', true)
    .order('name', { ascending: true })

  // Get revealed notable people in this town
  const { data: notablePeople } = await supabase
    .from('notable_people')
    .select('id, name, race, role')
    .eq('town_id', params.townId)
    .eq('is_revealed', true)
    .order('name', { ascending: true })

  return (
    <main className="min-h-screen p-6 bg-surface">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="headline-lg text-gold">{town.name}</h1>
            {town.description && (
              <p className="body-md text-muted mt-2">{town.description}</p>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href={`/player/campaigns/${params.campaignId}`}>← Back to Campaign</Link>
          </Button>
        </div>

        {/* Town Details */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {town.population !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted">Population</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface">{town.population.toLocaleString()}</p>
              </CardContent>
            </Card>
          )}
          
          {town.size && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted">Size</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface capitalize">{town.size}</p>
              </CardContent>
            </Card>
          )}
          
          {town.location && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface capitalize">{town.location.replace('_', ' ')}</p>
              </CardContent>
            </Card>
          )}
          
          {town.ruler && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted">Ruler</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface">{town.ruler}</p>
              </CardContent>
            </Card>
          )}
          
          {town.political_system && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted">Government</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface capitalize">{town.political_system.replace('_', ' ')}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {town.history && (
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface whitespace-pre-wrap">{town.history}</p>
            </CardContent>
          </Card>
        )}

        {/* Shops Section */}
        <div>
          <h2 className="headline-sm text-on-surface mb-4">Shops & Services</h2>
          {!shops || shops.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-md text-muted">
                  No shops have been revealed yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => (
                <Card key={shop.id} className="hover:border-gold transition-colors">
                  <CardHeader>
                    <CardTitle>{shop.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {shop.shop_type.replace('_', ' ')} · {shop.economic_tier}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {shop.operating_hours && (
                      <p className="text-sm text-muted">Hours: {shop.operating_hours}</p>
                    )}
                    <Button asChild className="w-full">
                      <Link href={`/player/campaigns/${params.campaignId}/shops/${shop.id}`}>
                        Browse Shop
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Notable People Section */}
        <div>
          <h2 className="headline-sm text-on-surface mb-4">Notable People</h2>
          {!notablePeople || notablePeople.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-md text-muted">
                  No notable people have been revealed yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notablePeople.map((person) => (
                <Card key={person.id} className="hover:border-gold transition-colors">
                  <CardHeader>
                    <CardTitle>{person.name}</CardTitle>
                    <CardDescription>
                      {person.race && <span>{person.race} · </span>}
                      <span className="capitalize">{person.role.replace('_', ' ')}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/player/campaigns/${params.campaignId}/people/${person.id}`}>
                        View Details
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
