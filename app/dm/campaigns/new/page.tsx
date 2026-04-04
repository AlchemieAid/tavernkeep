import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

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

    const name = formData.get('name') as string
    const description = formData.get('description') as string

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        dm_id: user.id,
        name,
        description,
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
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/dm/dashboard" className="body-md text-gold hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="headline-lg text-gold mt-4">Create Campaign</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
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

              <div className="flex gap-4">
                <Button type="submit">Create Campaign</Button>
                <Button asChild variant="outline">
                  <Link href="/dm/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
