import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default async function EditShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: shop, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .eq('dm_id', user.id)
    .single()

  if (error || !shop) {
    notFound()
  }

  async function updateShop(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const name = formData.get('name') as string
    const shopType = formData.get('shop_type') as string
    const economicTier = formData.get('economic_tier') as string
    const locationDescriptor = formData.get('location_descriptor') as string
    const inventoryVolatility = formData.get('inventory_volatility') as string
    const keeperName = formData.get('keeper_name') as string
    const keeperRace = formData.get('keeper_race') as string
    const keeperBackstory = formData.get('keeper_backstory') as string
    const priceModifier = formData.get('price_modifier') as string
    const haggleEnabled = formData.get('haggle_enabled') as string
    const haggleDc = formData.get('haggle_dc') as string

    const { error } = await supabase
      .from('shops')
      .update({
        name,
        shop_type: shopType,
        location_descriptor: locationDescriptor || null,
        economic_tier: economicTier,
        inventory_volatility: inventoryVolatility,
        keeper_name: keeperName || null,
        keeper_race: keeperRace || null,
        keeper_backstory: keeperBackstory || null,
        price_modifier: parseFloat(priceModifier),
        haggle_enabled: haggleEnabled === 'true',
        haggle_dc: haggleEnabled === 'true' ? parseInt(haggleDc) : null,
      } as any)
      .eq('id', shopId)
      .eq('dm_id', user.id)

    if (error) {
      console.error('Error updating shop:', error)
      redirect(`/dm/shops/${shopId}/edit?error=update_failed`)
    }

    revalidatePath(`/dm/shops/${shopId}`)
    redirect(`/dm/shops/${shopId}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Edit Shop</h1>
        <p className="body-md text-on-surface-variant mt-2">
          Update {shop.name}
        </p>
      </div>

      <form action={updateShop} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shop Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={shop.name}
                placeholder="e.g., The Rusty Dragon Inn"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shop_type">Shop Type</Label>
              <Select name="shop_type" defaultValue={shop.shop_type} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select shop type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Store</SelectItem>
                  <SelectItem value="weapons">Weapons Shop</SelectItem>
                  <SelectItem value="armor">Armor Shop</SelectItem>
                  <SelectItem value="magic">Magic Shop</SelectItem>
                  <SelectItem value="apothecary">Apothecary</SelectItem>
                  <SelectItem value="black_market">Black Market</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="economic_tier">Economic Tier</Label>
              <Select name="economic_tier" defaultValue={shop.economic_tier} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select economic tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="modest">Modest</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="wealthy">Wealthy</SelectItem>
                  <SelectItem value="opulent">Opulent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory_volatility">Inventory Volatility</Label>
              <Select name="inventory_volatility" defaultValue={shop.inventory_volatility} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select volatility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static (never changes)</SelectItem>
                  <SelectItem value="slow">Slow (changes weekly)</SelectItem>
                  <SelectItem value="moderate">Moderate (changes daily)</SelectItem>
                  <SelectItem value="fast">Fast (changes hourly)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_descriptor">Location (Optional)</Label>
              <Input
                id="location_descriptor"
                name="location_descriptor"
                defaultValue={shop.location_descriptor || ''}
                placeholder="e.g., Market District, Near the Docks"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shopkeeper Details (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="keeper_name">Keeper Name</Label>
              <Input
                id="keeper_name"
                name="keeper_name"
                defaultValue={shop.keeper_name || ''}
                placeholder="e.g., Ameiko Kaijitsu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keeper_race">Keeper Race</Label>
              <Input
                id="keeper_race"
                name="keeper_race"
                defaultValue={shop.keeper_race || ''}
                placeholder="e.g., Half-Elf, Dwarf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keeper_backstory">Keeper Backstory</Label>
              <Textarea
                id="keeper_backstory"
                name="keeper_backstory"
                defaultValue={shop.keeper_backstory || ''}
                placeholder="Brief backstory of the shopkeeper..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Haggling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="price_modifier">Price Modifier</Label>
              <Input
                id="price_modifier"
                name="price_modifier"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                defaultValue={shop.price_modifier}
                required
              />
              <p className="text-xs text-on-surface-variant">
                Multiplier for all item prices (1.0 = normal, 1.5 = 50% markup, 0.8 = 20% discount)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="haggle_enabled">Haggling Enabled</Label>
              <Select name="haggle_enabled" defaultValue={shop.haggle_enabled ? 'true' : 'false'} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shop.haggle_enabled && (
              <div className="space-y-2">
                <Label htmlFor="haggle_dc">Haggle DC</Label>
                <Input
                  id="haggle_dc"
                  name="haggle_dc"
                  type="number"
                  min="1"
                  max="30"
                  defaultValue={shop.haggle_dc || 15}
                />
                <p className="text-xs text-on-surface-variant">
                  Difficulty class for Persuasion checks to haggle prices down
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit">Save Changes</Button>
          <Button type="button" variant="outline" asChild>
            <a href={`/dm/shops/${shopId}`}>Cancel</a>
          </Button>
        </div>
      </form>
    </div>
  )
}
