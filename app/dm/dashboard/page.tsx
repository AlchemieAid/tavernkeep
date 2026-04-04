import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, shops(count)')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="headline-lg text-gold">DM Dashboard</h1>
            <p className="body-md text-on-surface-variant mt-2">
              Manage your campaigns and shops
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="outline" type="submit">Sign Out</Button>
          </form>
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link href="/dm/campaigns/new">Create Campaign</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <CardTitle>{campaign.name}</CardTitle>
                <CardDescription>{campaign.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dm/campaigns/${campaign.id}`}>
                    View Campaign
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!campaigns?.length && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="body-lg text-on-surface-variant">
                No campaigns yet. Create your first campaign to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
