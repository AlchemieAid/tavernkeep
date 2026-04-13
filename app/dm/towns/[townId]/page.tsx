import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { ActionMenu } from '@/components/shared/delete-menu'
import { Pencil } from 'lucide-react'
import { AINotablePersonGenerator } from '@/components/dm/ai-notable-person-generator'
import { AIShopGenerator } from '@/components/dm/ai-shop-generator'
import { CreationCardPair } from '@/components/shared/creation-card-pair'
import { VisibilityToggle } from '@/components/dm/visibility-toggle'

export default async function TownPage({
  params,
}: {
  params: Promise<{ townId: string }>
}) {
  const { townId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: town, error } = await supabase
    .from('towns')
    .select('*')
    .eq('id', townId)
    .eq('dm_id', user.id)
    .single()

  if (error || !town) {
    notFound()
  }

  const { data: shops } = await supabase
    .from('shops')
    .select('*')
    .eq('town_id', townId)
    .order('created_at', { ascending: false })

  const { data: notablePeople } = await supabase
    .from('notable_people')
    .select('*')
    .eq('town_id', townId)
    .order('created_at', { ascending: false })

  async function deleteShop(shopId: string) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    await supabase
      .from('shops')
      .delete()
      .eq('id', shopId)
      .eq('dm_id', user.id)

    revalidatePath(`/dm/towns/${townId}`)
  }

  async function deleteNotablePerson(personId: string) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    await supabase
      .from('notable_people')
      .delete()
      .eq('id', personId)
      .eq('dm_id', user.id)

    revalidatePath(`/dm/towns/${townId}`)
  }

  async function toggleTownVisibility(townId: string, isRevealed: boolean) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error: townError } = await supabase
      .from('towns')
      .update({ is_revealed: isRevealed } as any)
      .eq('id', townId)
      .eq('dm_id', user.id)

    if (townError) {
      console.error('Error toggling town visibility:', townError)
      throw townError
    }

    revalidatePath(`/dm/towns/${townId}`)
  }

  async function toggleShopVisibility(shopId: string, isRevealed: boolean) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error: shopError } = await supabase
      .from('shops')
      .update({ is_revealed: isRevealed } as any)
      .eq('id', shopId)
      .eq('dm_id', user.id)

    if (shopError) {
      console.error('Error toggling shop visibility:', shopError)
      throw shopError
    }

    revalidatePath(`/dm/towns/${townId}`)
  }

  async function togglePersonVisibility(personId: string, isRevealed: boolean) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error: personError } = await supabase
      .from('notable_people')
      .update({ is_revealed: isRevealed } as any)
      .eq('id', personId)
      .eq('dm_id', user.id)

    if (personError) {
      console.error('Error toggling person visibility:', personError)
      throw personError
    }

    revalidatePath(`/dm/towns/${townId}`)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="headline-lg text-gold">{town.name}</h1>
          {town.description && (
            <p className="body-md text-on-surface-variant mt-2">
              {town.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          <VisibilityToggle
            entityType="town"
            entityId={town.id}
            isRevealed={town.is_revealed}
            entityName={town.name}
            onToggle={toggleTownVisibility}
          />
          <Button asChild>
            <Link href={`/dm/towns/${townId}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {town.population !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-on-surface-variant">Population</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface">{town.population.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
        
        {town.size && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-on-surface-variant">Size</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface capitalize">{town.size}</p>
            </CardContent>
          </Card>
        )}
        
        {town.location && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-on-surface-variant">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface capitalize">{town.location.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        )}
        
        {town.ruler && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-on-surface-variant">Ruler / Leadership</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface">{town.ruler}</p>
            </CardContent>
          </Card>
        )}
        
        {town.political_system && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-on-surface-variant">Political System</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface capitalize">{town.political_system.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        )}
        
        {town.history && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-on-surface-variant">History & Lore</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface whitespace-pre-wrap">{town.history}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="notable-people" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notable-people">Notable People</TabsTrigger>
          <TabsTrigger value="shops">Shops</TabsTrigger>
        </TabsList>

        <TabsContent value="notable-people" className="space-y-6">
          <CreationCardPair
            aiGenerator={<AINotablePersonGenerator townId={townId} />}
            manualTitle="Create Notable Person Manually"
            manualDescription="Add a custom character with full control over details"
            manualButtonText="Create Notable Person"
            manualButtonHref={`/dm/towns/${townId}/notable-people/new`}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notablePeople?.map((person) => (
              <Card key={person.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{person.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {person.race} · {person.role?.replace('_', ' ')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <VisibilityToggle
                        entityType="notable_person"
                        entityId={person.id}
                        isRevealed={person.is_revealed}
                        entityName={person.name}
                        onToggle={togglePersonVisibility}
                        variant="icon"
                      />
                      <ActionMenu
                        itemType="notable-person"
                        itemId={person.id}
                        editPath={`/dm/notable-people/${person.id}/edit`}
                        onDelete={async (id) => {
                          'use server'
                          const supabase = await createClient()
                          await supabase
                            .from('notable_people')
                            .delete()
                            .eq('id', id)
                            .eq('dm_id', user.id)
                          revalidatePath(`/dm/towns/${townId}`)
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {person.backstory && (
                    <p className="text-sm text-on-surface-variant">{person.backstory}</p>
                  )}
                  {person.personality_traits && person.personality_traits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {person.personality_traits.map((trait, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-surface-variant rounded">
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {!notablePeople?.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-lg text-on-surface-variant">
                  No notable people yet. Use the generator above to create interesting characters for your town.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shops" className="space-y-6">
          <CreationCardPair
            aiGenerator={<AIShopGenerator campaignId={town.campaign_id} townId={townId} />}
            manualTitle="Create Shop Manually"
            manualDescription="Build a custom shop with your own details"
            manualButtonText="Create Shop"
            manualButtonHref={`/dm/towns/${townId}/shops/new`}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shops?.map((shop) => (
              <Card key={shop.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{shop.name}</CardTitle>
                      <CardDescription>
                        {shop.shop_type} · {shop.economic_tier}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <VisibilityToggle
                        entityType="shop"
                        entityId={shop.id}
                        isRevealed={shop.is_revealed}
                        entityName={shop.name}
                        onToggle={toggleShopVisibility}
                        variant="icon"
                      />
                      <ActionMenu
                        itemType="shop"
                        itemId={shop.id}
                        editPath={`/dm/shops/${shop.id}/edit`}
                        onDelete={async (id) => {
                          'use server'
                          await deleteShop(id)
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/dm/shops/${shop.id}`}>
                      Manage Shop
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/shop/${shop.slug}`} target="_blank">
                      View Public Shop
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {!shops?.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-lg text-on-surface-variant">
                  No shops yet. Create your first shop for this town.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
