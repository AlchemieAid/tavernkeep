import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SHOP_TYPES, ECONOMIC_TIERS, INVENTORY_VOLATILITY, SHOP_TYPE_LABELS, ECONOMIC_TIER_LABELS, VOLATILITY_LABELS, SLUG_LENGTH, DEFAULT_PRICE_MODIFIER, DEFAULT_HAGGLE_DC } from '@/lib/constants'
import Link from 'next/link'

export default async function NewShopPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const { campaignId } = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  if (!campaignId) {
    redirect('/dm/dashboard')
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('dm_id', user.id)
    .single()

  if (!campaign) {
    redirect('/dm/dashboard')
  }

  // Capture resolved campaignId for server action closure
  const currentCampaignId = campaignId

  async function createShop(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const name = formData.get('name') as string
    const shop_type = formData.get('shop_type') as string
    const location_descriptor = formData.get('location_descriptor') as string
    const economic_tier = formData.get('economic_tier') as string
    const inventory_volatility = formData.get('inventory_volatility') as string
    const price_modifier = parseFloat(formData.get('price_modifier') as string)
    const haggle_enabled = formData.get('haggle_enabled') === 'on'
    const haggle_dc = haggle_enabled ? parseInt(formData.get('haggle_dc') as string) : null

    const slug = nanoid(SLUG_LENGTH)

    const { data: shop, error } = await supabase
      .from('shops')
      .insert({
        campaign_id: currentCampaignId,
        dm_id: user.id,
        name,
        slug,
        shop_type,
        location_descriptor,
        economic_tier,
        inventory_volatility,
        price_modifier,
        haggle_enabled,
        haggle_dc,
        is_active: true,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating shop:', error)
      redirect(`/dm/campaigns/${currentCampaignId}?error=shop_create_failed`)
    }

    redirect(`/dm/shops/${shop.id}`)
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href={`/dm/campaigns/${campaignId}`} className="body-md text-gold hover:underline">
            ← Back to Campaign
          </Link>
          <h1 className="headline-lg text-gold mt-4">Create Shop</h1>
          <p className="body-md text-on-surface-variant mt-2">
            {campaign.name}
          </p>
        </div>

        <form action={createShop} className="space-y-6">
          <input type="hidden" name="campaign_id" value={campaignId} />

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Shop Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="The Gilded Griffin"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shop_type">Shop Type</Label>
                <select
                  id="shop_type"
                  name="shop_type"
                  className="flex h-9 w-full rounded-md bg-surface-container-lowest px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                  required
                >
                  {SHOP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SHOP_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_descriptor">Location (optional)</Label>
                <Input
                  id="location_descriptor"
                  name="location_descriptor"
                  placeholder="Dockside port town"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="economic_tier">Economic Tier</Label>
                <select
                  id="economic_tier"
                  name="economic_tier"
                  className="flex h-9 w-full rounded-md bg-surface-container-lowest px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                  required
                >
                  {ECONOMIC_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {ECONOMIC_TIER_LABELS[tier]}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shop Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price_modifier">Price Modifier (%)</Label>
                <Input
                  id="price_modifier"
                  name="price_modifier"
                  type="number"
                  step="10"
                  min="50"
                  max="200"
                  defaultValue={DEFAULT_PRICE_MODIFIER}
                  required
                />
                <p className="text-xs text-on-surface-variant">
                  Percentage of base price (100% = normal, 110% = 10% markup)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory_volatility">Inventory Volatility</Label>
                <select
                  id="inventory_volatility"
                  name="inventory_volatility"
                  className="flex h-9 w-full rounded-md bg-surface-container-lowest px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                  required
                >
                  {INVENTORY_VOLATILITY.map((vol) => (
                    <option key={vol} value={vol}>
                      {VOLATILITY_LABELS[vol]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="haggle_enabled"
                    name="haggle_enabled"
                    className="w-4 h-4"
                  />
                  <Label htmlFor="haggle_enabled">Enable Haggling</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="haggle_dc">Haggle DC</Label>
                <Input
                  type="number"
                  id="haggle_dc"
                  name="haggle_dc"
                  min="5"
                  max="30"
                  defaultValue={DEFAULT_HAGGLE_DC}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit">Create Shop</Button>
            <Button asChild variant="outline">
              <Link href={`/dm/campaigns/${campaignId}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
