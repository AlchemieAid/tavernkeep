import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

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

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <Link href="/dm/dashboard" className="body-md text-gold hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="headline-lg text-gold mt-4">{campaign.name}</h1>
          {campaign.description && (
            <p className="body-md text-on-surface-variant mt-2">
              {campaign.description}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link href={`/dm/shops/new?campaignId=${campaignId}`}>
              Create Shop
            </Link>
          </Button>
          {activeShop && (
            <Button asChild variant="outline">
              <Link href={`/dm/shops/${activeShop.id}/qr`}>
                View QR Code
              </Link>
            </Button>
          )}
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Shops</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shops?.map((shop) => (
              <Card key={shop.id} className={shop.is_active ? 'ring-2 ring-gold' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{shop.name}</CardTitle>
                    {shop.is_active && (
                      <span className="text-xs px-2 py-1 rounded-md bg-gold text-on-gold">
                        Active
                      </span>
                    )}
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
    </main>
  )
}
