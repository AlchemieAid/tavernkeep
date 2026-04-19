/**
 * Campaign Detail Page
 * @page /dm/campaigns/[campaignId]
 * @auth Required - DM (must own campaign)
 * @description Campaign overview with towns list and management options
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { AITownGenerator } from '@/components/dm/ai-town-generator'
import { ActionMenu } from '@/components/shared/delete-menu'
import { Pencil, Plus, Map } from 'lucide-react'
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

  const { data: campaignMaps } = await supabase
    .from('campaign_maps')
    .select('id, image_url, map_size, map_style, setup_stage, creation_method')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  // Capture resolved campaignId for server action closures
  const currentCampaignId = campaignId

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

    revalidatePath(`/dm/campaigns/${currentCampaignId}`)
  }

  async function toggleTownVisibility(townId: string, isRevealed: boolean) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Unauthorized')
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

    revalidatePath(`/dm/campaigns/${currentCampaignId}`)
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="headline-lg text-gold">{campaign.name}</h1>
            {campaign.description && (
              <p className="body-md text-on-surface-variant mt-2">
                {campaign.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 sm:flex-shrink-0">
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

        {/* World Maps Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="headline-sm text-on-surface flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" />
              World Maps
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dm/campaigns/${campaignId}/maps`}>
                <Plus className="w-4 h-4 mr-2" />
                {campaignMaps?.length ? 'Add Map' : 'Create Map'}
              </Link>
            </Button>
          </div>

          {!campaignMaps?.length ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Map className="w-10 h-10 mx-auto text-on-surface-variant opacity-30 mb-3" />
                <p className="body-md text-on-surface-variant mb-4">No maps yet. Create an AI-generated or uploaded map for your campaign.</p>
                <Button asChild size="sm">
                  <Link href={`/dm/campaigns/${campaignId}/maps`}>Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {campaignMaps.map(m => (
                <Link
                  key={m.id}
                  href={`/dm/campaigns/${campaignId}/maps/${m.id}`}
                  className="group relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all"
                  style={{ aspectRatio: '16/9' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image_url} alt="Map" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-3 flex items-center gap-2">
                    {m.setup_stage !== 'ready' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-semibold uppercase tracking-wide">Setup</span>
                    )}
                    <span className="text-xs font-semibold text-white capitalize">{m.map_style?.replace(/_/g,' ') ?? m.map_size}</span>
                  </div>
                </Link>
              ))}
              <Link
                href={`/dm/campaigns/${campaignId}/maps`}
                className="rounded-xl border border-dashed border-border hover:border-primary/40 transition-all flex items-center justify-center gap-2 text-sm text-on-surface-variant hover:text-primary"
                style={{ aspectRatio: '16/9', minHeight: '80px' }}
              >
                <Plus className="w-4 h-4" />
                Add Map
              </Link>
            </div>
          )}
        </div>

        {/* Town Creation Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="headline-sm text-on-surface">Create Town</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dm/campaigns/${campaignId}/towns/new`}>
                <Plus className="w-4 h-4 mr-2" />
                Create Manually
              </Link>
            </Button>
          </div>
          <AITownGenerator campaignId={campaignId} />
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Your Towns</h2>
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
