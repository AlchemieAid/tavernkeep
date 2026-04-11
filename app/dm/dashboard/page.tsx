import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { DeleteMenu } from '@/components/shared/delete-menu'
import { AIWorldGenerator } from '@/components/dm/ai-world-generator'

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

  async function deleteCampaign(campaignId: string) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('dm_id', user.id)

    revalidatePath('/dm/dashboard')
    revalidatePath('/', 'layout') // Refresh navigation dropdowns
  }

  return (
    <div className="space-y-8">
        <div>
          <h1 className="headline-lg text-gold">DM Dashboard</h1>
          <p className="body-md text-on-surface-variant mt-2">
            Manage your campaigns and shops
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <AIWorldGenerator />
          
          <Card>
            <CardHeader>
              <CardTitle>Manual Campaign Creation</CardTitle>
              <CardDescription>
                Create a campaign manually with full control over all settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/dm/campaigns/new">Create Campaign Manually</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Your Campaigns</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{campaign.name}</CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <DeleteMenu
                    itemType="campaign"
                    itemId={campaign.id}
                    onDelete={async (id) => {
                      'use server'
                      await deleteCampaign(id)
                    }}
                  />
                </div>
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
    </div>
  )
}
