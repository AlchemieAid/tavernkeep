import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
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

export default async function NewCampaignPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

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

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dm/dashboard" className="body-md text-gold hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="headline-lg text-gold mt-4">Create Campaign</h1>
            <p className="text-on-surface-variant mt-2">
              Generate a complete world with AI or create a campaign manually
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

        {/* AI Generator - Full Width */}
        <AICampaignGenerator />
      </div>
    </main>
  )
}
