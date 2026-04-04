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

  const { data: shops } = await supabase
    .from('shops')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  const activeShop = shops?.find(s => s.is_active)

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

        <div className="grid gap-6 md:grid-cols-2">
          <AIShopGenerator campaignId={campaignId} />
          
          <Card>
            <CardHeader>
              <CardTitle>Manual Shop Creation</CardTitle>
              <CardDescription>
                Create a shop manually with full control over all settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link href={`/dm/shops/new?campaignId=${campaignId}`}>
                  Create Shop Manually
                </Link>
              </Button>
              {activeShop && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dm/shops/${activeShop.id}/qr`}>
                    View Active Shop QR Code
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Shops</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shops?.map((shop) => (
              <Card key={shop.id} className={shop.is_active ? 'ring-2 ring-gold' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{shop.name}</CardTitle>
                      {shop.is_active && (
                        <span className="text-xs px-2 py-1 rounded-md bg-gold text-on-gold">
                          Active
                        </span>
                      )}
                    </div>
                    <DeleteMenu
                      itemType="shop"
                      itemId={shop.id}
                      onDelete={async (id) => {
                        'use server'
                        await deleteShop(id)
                      }}
                    />
                  </div>
                  <CardDescription>
                    {shop.shop_type} · {shop.economic_tier}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/dm/shops/${shop.id}`}>
                      Manage Shop
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href={`/shop/${shop.slug}`} target="_blank">
                      Preview
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
                  No shops yet. Create your first shop to share with your party.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  )
}
