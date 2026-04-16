/**
 * Edit Shop Page
 * @page /dm/shops/[shopId]/edit
 * @auth Required - DM
 * @description Form for editing shop details and shopkeeper info
 */

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface Shop {
  id: string
  name: string
  shop_type: string
  economic_tier: string
  inventory_volatility: string
  location_descriptor: string | null
  keeper_name: string | null
  keeper_race: string | null
  keeper_backstory: string | null
  price_modifier: number
  haggle_enabled: boolean
  haggle_dc: number | null
  dm_id: string
}

export default function EditShopPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { shopId } = params
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    shop_type: '',
    economic_tier: '',
    inventory_volatility: '',
    location_descriptor: '',
    keeper_name: '',
    keeper_race: '',
    keeper_backstory: '',
    price_modifier: 100,
    haggle_enabled: 'false',
    haggle_dc: 15,
  })

  // Original data for comparison
  const [originalData, setOriginalData] = useState<typeof formData | null>(null)

  useEffect(() => {
    async function loadShop() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .eq('dm_id', user.id)
        .single()

      if (shopError || !shopData) {
        setError('Shop not found')
        setIsLoading(false)
        return
      }

      setShop(shopData)
      const initialData = {
        name: shopData.name,
        shop_type: shopData.shop_type,
        economic_tier: shopData.economic_tier,
        inventory_volatility: shopData.inventory_volatility,
        location_descriptor: shopData.location_descriptor || '',
        keeper_name: shopData.keeper_name || '',
        keeper_race: shopData.keeper_race || '',
        keeper_backstory: shopData.keeper_backstory || '',
        price_modifier: shopData.price_modifier,
        haggle_enabled: shopData.haggle_enabled ? 'true' : 'false',
        haggle_dc: shopData.haggle_dc || 15,
      }
      setFormData(initialData)
      setOriginalData(initialData)
      setIsLoading(false)
    }

    loadShop()
  }, [shopId, router])

  useEffect(() => {
    if (!originalData) return
    const changed = Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== originalData[key as keyof typeof originalData]
    )
    setHasChanges(changed)
  }, [formData, originalData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasChanges) return

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('shops')
        .update({
          name: formData.name,
          shop_type: formData.shop_type,
          location_descriptor: formData.location_descriptor || null,
          economic_tier: formData.economic_tier,
          inventory_volatility: formData.inventory_volatility,
          keeper_name: formData.keeper_name || null,
          keeper_race: formData.keeper_race || null,
          keeper_backstory: formData.keeper_backstory || null,
          price_modifier: formData.price_modifier,
          haggle_enabled: formData.haggle_enabled === 'true',
          haggle_dc: formData.haggle_enabled === 'true' ? formData.haggle_dc : null,
        } as any)
        .eq('id', shopId)
        .eq('dm_id', user.id)

      if (updateError) {
        console.error('[EDIT SHOP] Update error:', updateError)
        setError(`Failed to update shop: ${updateError.message}`)
        return
      }

      router.push(`/dm/shops/${shopId}`)
      router.refresh()
    })
  }

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded mt-2" />
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="space-y-8">
        <h1 className="headline-lg text-gold">Error</h1>
        <p className="text-red-500">{error || 'Shop not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Edit Shop</h1>
        <p className="body-md text-on-surface-variant mt-2">
          Update {shop.name}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., The Rusty Dragon Inn"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shop_type">Shop Type</Label>
              <Select 
                name="shop_type" 
                value={formData.shop_type}
                onValueChange={(value) => updateField('shop_type', value)}
                required
              >
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
              <Select 
                name="economic_tier" 
                value={formData.economic_tier}
                onValueChange={(value) => updateField('economic_tier', value)}
                required
              >
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
              <Select 
                name="inventory_volatility" 
                value={formData.inventory_volatility}
                onValueChange={(value) => updateField('inventory_volatility', value)}
                required
              >
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
                value={formData.location_descriptor}
                onChange={(e) => updateField('location_descriptor', e.target.value)}
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
                value={formData.keeper_name}
                onChange={(e) => updateField('keeper_name', e.target.value)}
                placeholder="e.g., Ameiko Kaijitsu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keeper_race">Keeper Race</Label>
              <Input
                id="keeper_race"
                name="keeper_race"
                value={formData.keeper_race}
                onChange={(e) => updateField('keeper_race', e.target.value)}
                placeholder="e.g., Half-Elf, Dwarf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keeper_backstory">Keeper Backstory</Label>
              <Textarea
                id="keeper_backstory"
                name="keeper_backstory"
                value={formData.keeper_backstory}
                onChange={(e) => updateField('keeper_backstory', e.target.value)}
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="price_modifier">Price Modifier</Label>
                <span className="text-sm font-medium text-gold">{formData.price_modifier}%</span>
              </div>
              <Slider
                id="price_modifier"
                name="price_modifier"
                min={50}
                max={200}
                step={5}
                value={[formData.price_modifier]}
                onValueChange={(value) => updateField('price_modifier', value[0])}
              />
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>50% (cheap)</span>
                <span>100% (normal)</span>
                <span>200% (expensive)</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Adjust all item prices by this percentage. 100% = base price, 150% = 50% markup.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="haggle_enabled">Haggling Enabled</Label>
              <Select 
                name="haggle_enabled" 
                value={formData.haggle_enabled}
                onValueChange={(value) => updateField('haggle_enabled', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.haggle_enabled === 'true' && (
              <div className="space-y-2">
                <Label htmlFor="haggle_dc">Haggle DC</Label>
                <Input
                  id="haggle_dc"
                  name="haggle_dc"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.haggle_dc}
                  onChange={(e) => updateField('haggle_dc', parseInt(e.target.value) || 15)}
                />
                <p className="text-xs text-on-surface-variant">
                  Difficulty class for Persuasion checks to haggle prices down
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={!hasChanges || isPending}
            className="min-w-[120px]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              'Save Changes'
            ) : (
              'No Changes'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/dm/shops/${shopId}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
