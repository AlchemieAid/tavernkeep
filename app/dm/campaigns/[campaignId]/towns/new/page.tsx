import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default async function NewTownPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('id', campaignId)
    .eq('dm_id', user.id)
    .single()

  if (!campaign) {
    redirect('/dm/dashboard')
  }

  async function createTown(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string

    const { error } = await supabase
      .from('towns')
      .insert({
        campaign_id: campaignId,
        dm_id: user.id,
        name,
        description: description || null,
      })

    if (error) {
      console.error('Error creating town:', error)
      redirect(`/dm/campaigns/${campaignId}?error=town_creation_failed`)
    }

    revalidatePath(`/dm/campaigns/${campaignId}`)
    redirect(`/dm/campaigns/${campaignId}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Create New Town</h1>
        <p className="body-md text-on-surface-variant mt-2">
          Add a new town to {campaign.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Town Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTown} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Town Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Waterdeep, Neverwinter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the town, its atmosphere, notable features..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit">Create Town</Button>
              <Button type="button" variant="outline" asChild>
                <a href={`/dm/campaigns/${campaignId}`}>Cancel</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
