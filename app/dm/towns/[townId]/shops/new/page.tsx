import { redirect } from 'next/navigation'
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
import { nanoid } from 'nanoid'

const SLUG_LENGTH = 12

export default async function NewShopPage({
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

  // Verify town ownership and get campaign info
  const { data: town, error: townError } = await supabase
    .from('towns')
    .select('*')
    .eq('id', townId)
    .eq('dm_id', user.id)
    .single()

  if (townError || !town) {
    redirect('/dm/dashboard')
  }

  async function createShop(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // Fetch town data to get campaign_id
    const { data: townData } = await supabase
      .from('towns')
      .select('campaign_id')
      .eq('id', townId)
      .eq('dm_id', user.id)
      .single()

    if (!townData) {
      redirect('/dm/dashboard')
    }

    const name = formData.get('name') as string
    const shopType = formData.get('shop_type') as string
    const economicTier = formData.get('economic_tier') as string
    const locationDescriptor = formData.get('location_descriptor') as string
    const keeperName = formData.get('keeper_name') as string
    const keeperRace = formData.get('keeper_race') as string
    const keeperBackstory = formData.get('keeper_backstory') as string

    const slug = nanoid(SLUG_LENGTH)

    const shopData = {
      campaign_id: townData.campaign_id,
      town_id: townId,
      dm_id: user.id,
      name,
      slug,
      shop_type: shopType,
      location_descriptor: locationDescriptor || null,
      economic_tier: economicTier,
      inventory_volatility: 'moderate',
      keeper_name: keeperName || null,
      keeper_race: keeperRace || null,
      keeper_backstory: keeperBackstory || null,
      keeper_personality_traits: null,
      keeper_motivation: null,
      price_modifier: 1.0,
      haggle_enabled: true,
      haggle_dc: 15,
      is_active: true,
    }

    console.log('Attempting to create shop with data:', JSON.stringify(shopData, null, 2))

    const { error } = await supabase
      .from('shops')
      .insert(shopData as any)

    if (error) {
      console.error('Error creating shop:', JSON.stringify(error, null, 2))
      console.error('Error details - code:', error.code, 'message:', error.message, 'details:', error.details)
      redirect(`/dm/towns/${townId}?error=shop_creation_failed&details=${encodeURIComponent(error.message)}`)
    }

    revalidatePath(`/dm/towns/${townId}`)
    redirect(`/dm/towns/${townId}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Create New Shop</h1>
        <p className="body-md text-on-surface-variant mt-2">
          Add a new shop to {town.name}
        </p>
      </div>

      <form action={createShop} className="space-y-6">
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
                placeholder="e.g., The Rusty Dragon Inn"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shop_type">Shop Type</Label>
              <Select name="shop_type" required>
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
              <Select name="economic_tier" required>
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
              <Label htmlFor="location_descriptor">Location (Optional)</Label>
              <Input
                id="location_descriptor"
                name="location_descriptor"
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
                placeholder="e.g., Ameiko Kaijitsu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keeper_race">Keeper Race</Label>
              <Input
                id="keeper_race"
                name="keeper_race"
                placeholder="e.g., Half-Elf, Dwarf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keeper_backstory">Keeper Backstory</Label>
              <Textarea
                id="keeper_backstory"
                name="keeper_backstory"
                placeholder="Brief backstory of the shopkeeper..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit">Create Shop</Button>
          <Button type="button" variant="outline" asChild>
            <a href={`/dm/towns/${townId}`}>Cancel</a>
          </Button>
        </div>
      </form>
    </div>
  )
}
