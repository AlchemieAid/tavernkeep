import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { AITownGenerator } from '@/components/dm/ai-town-generator'
import { ActionMenu } from '@/components/shared/delete-menu'
import { Pencil } from 'lucide-react'
import { CreationCardPair } from '@/components/shared/creation-card-pair'
import { CampaignInviteModal } from '@/components/dm/campaign-invite-modal'
import { VisibilityToggle } from '@/components/dm/visibility-toggle'

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

  async function toggleTownVisibility(townId: string, isRevealed: boolean) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error } = await supabase
      .from('towns')
      .update({ is_revealed: isRevealed })
      .eq('id', townId)
      .eq('dm_id', user.id)

    if (error) {
      console.error('Error toggling town visibility:', error)
      throw error
    }

    revalidatePath(`/dm/campaigns/${campaignId}`)
  }

  return (
    <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="headline-lg text-gold">{campaign.name}</h1>
            {campaign.description && (
              <p className="body-md text-on-surface-variant mt-2">
                {campaign.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <CampaignInviteModal
              campaignId={campaignId}
              campaignName={campaign.name}
              inviteToken={campaign.invite_token}
            />
            <Button asChild>
              <Link href={`/dm/campaigns/${campaignId}/edit`}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Campaign
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaign.ruleset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-on-surface-variant">Ruleset</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface">{campaign.ruleset}</p>
              </CardContent>
            </Card>
          )}
          
          {campaign.setting && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-on-surface-variant">Setting / World</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface">{campaign.setting}</p>
              </CardContent>
            </Card>
          )}
          
          {campaign.currency_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-on-surface-variant">Currency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface font-semibold">{campaign.currency_name}</p>
                {campaign.currency_description && (
                  <p className="text-sm text-on-surface-variant mt-1">{campaign.currency_description}</p>
                )}
              </CardContent>
            </Card>
          )}
          
          {campaign.history && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-on-surface-variant">History & Lore</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface whitespace-pre-wrap">{campaign.history}</p>
              </CardContent>
            </Card>
          )}
          
          {campaign.pantheon && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-on-surface-variant">Pantheon & Deities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-on-surface whitespace-pre-wrap">{campaign.pantheon}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <CreationCardPair
          aiGenerator={<AITownGenerator campaignId={campaignId} />}
          manualTitle="Create Town Manually"
          manualDescription="Create a town manually with full control over all settings"
          manualButtonText="Create Town"
          manualButtonHref={`/dm/campaigns/${campaignId}/towns/new`}
        />

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
                    <div className="flex items-center gap-1">
                      <VisibilityToggle
                        entityType="town"
                        entityId={town.id}
                        isRevealed={town.is_revealed}
                        entityName={town.name}
                        onToggle={toggleTownVisibility}
                        variant="icon"
                      />
                      <ActionMenu
                        itemType="town"
                        itemId={town.id}
                        editPath={`/dm/towns/${town.id}/edit`}
                        onDelete={async (id) => {
                          'use server'
                          await deleteTown(id)
                        }}
                      />
                    </div>
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
