import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { AIShopGenerator } from '@/components/dm/ai-shop-generator'
import { DeleteMenu } from '@/components/shared/delete-menu'

export default async function CampaignPage({
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

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('dm_id', user.id)
    .single()

  if (error || !campaign) {
    notFound()
  }

  const { data: towns } = await supabase
    .from('towns')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  async function deleteTown(townId: string) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    await supabase
      .from('towns')
      .delete()
      .eq('id', townId)
      .eq('dm_id', user.id)

    revalidatePath(`/dm/campaigns/${campaignId}`)
  }

  return (
    <div className="space-y-8">
        <div>
          <h1 className="headline-lg text-gold">{campaign.name}</h1>
          {campaign.description && (
            <p className="body-md text-on-surface-variant mt-2">
              {campaign.description}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link href={`/dm/campaigns/${campaignId}/towns/new`}>Create Town</Link>
          </Button>
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Towns</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {towns?.map((town) => (
              <Card key={town.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{town.name}</CardTitle>
                      {town.description && (
                        <CardDescription className="mt-2">{town.description}</CardDescription>
                      )}
                    </div>
                    <DeleteMenu
                      itemType="town"
                      itemId={town.id}
                      onDelete={async (id) => {
                        'use server'
                        await deleteTown(id)
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/dm/towns/${town.id}`}>
                      View Town
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {!towns?.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-lg text-on-surface-variant">
                  No towns yet. Create your first town to organize your shops.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  )
}
