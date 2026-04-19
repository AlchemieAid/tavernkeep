/**
 * DM Dashboard Page
 * @page /dm/dashboard
 * @auth Required - DM
 * @description Main DM dashboard showing all campaigns with create/manage options
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { DeleteMenu } from '@/components/shared/delete-menu'
import { AICampaignGenerator } from '@/components/dm/ai-campaign-generator'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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

  async function createCampaign(formData: FormData) {
    'use server'
    
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
        display_name: user.email,
        avatar_url: user.user_metadata?.avatar_url,
      })
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const currency = formData.get('currency') as string || 'gp'

    // Generate invite token and slug
    const inviteToken = crypto.randomUUID()
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        dm_id: user.id,
        name,
        description,
        currency,
        invite_token: inviteToken,
        slug: slug,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      redirect('/dm/dashboard?error=campaign_create_failed')
    }

    redirect(`/dm/campaigns/${campaign.id}`)
  }

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

    // Force full page refresh to update all client-side caches including navigation dropdowns
    redirect('/dm/dashboard?refresh=' + Date.now())
  }

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="headline-lg text-gold">DM Dashboard</h1>
            <p className="body-md text-on-surface-variant mt-2">
              Manage your campaigns and shops
            </p>
          </div>
          
          {/* Manual Creation Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Manually
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Campaign Manually</DialogTitle>
                <DialogDescription>
                  Create an empty campaign and add content yourself
                </DialogDescription>
              </DialogHeader>
              <form action={createCampaign} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="The Lost Mines of Phandelver"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="A classic adventure for new adventurers"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency (optional)</Label>
                  <Input
                    id="currency"
                    name="currency"
                    placeholder="e.g., gp, sh, drakes"
                    defaultValue="gp"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    Currency abbreviation used in this campaign (defaults to &ldquo;gp&rdquo;)
                  </p>
                </div>

                <div className="flex gap-4 justify-end">
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button type="submit">Create Campaign</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* AI Campaign Generator - Full Width */}
        <AICampaignGenerator />

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
