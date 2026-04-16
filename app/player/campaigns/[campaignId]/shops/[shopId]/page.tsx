/**
 * Player Shop Page
 * @page /player/campaigns/[campaignId]/shops/[shopId]
 * @auth Required - Player
 * @description Shop browsing with cart functionality. Only shows visible, in-stock items.
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag } from '@/components/player/shopping-cart'
import { AddToCartButton } from '@/components/player/add-to-cart-button'
import { Coins, Package, User } from 'lucide-react'

interface PlayerShopPageProps {
  params: Promise<{
    campaignId: string
    shopId: string
  }>
}

export default async function PlayerShopPage({ params }: PlayerShopPageProps) {
  const { campaignId, shopId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/player/login')
  }

  // Get player profile
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!player) {
    redirect('/player/profile/create')
  }

  // Verify campaign membership
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('player_id', player.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    redirect('/player/campaigns')
  }

  // Get active character for this campaign
  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('campaign_id', campaignId)
    .eq('player_id', player.id)
    .single()

  if (!character) {
    redirect(`/player/campaigns/${campaignId}/characters/new`)
  }

  // Get shop (RLS policy ensures it's revealed)
  const { data: shop, error } = await supabase
    .from('shops')
    .select(`
      id,
      name,
      slug,
      shop_type,
      location_descriptor,
      economic_tier,
      price_modifier,
      haggle_enabled,
      haggle_dc,
      keeper_name,
      keeper_race,
      keeper_backstory,
      keeper_motivation,
      keeper_personality_traits,
      keeper_image_url,
      shop_exterior_image_url,
      shop_interior_image_url,
      campaign_id,
      campaigns!inner(currency)
    `)
    .eq('id', shopId)
    .eq('campaign_id', campaignId)
    .eq('is_revealed', true)
    .single()

  if (error || !shop) {
    notFound()
  }

  // Extract currency from campaign
  const currency = (shop as any).campaigns?.currency || 'gp'

  // Get revealed items in this shop
  const { data: items } = await supabase
    .from('items')
    .select('id, name, description, base_price_gp, rarity, stock_quantity, weight_lbs, properties')
    .eq('shop_id', shopId)
    .eq('is_revealed', true)
    .order('rarity', { ascending: true })
    .order('base_price_gp', { ascending: true })

  // Get items already in cart (to show as locked)
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('item_id')
    .eq('shop_id', shopId)

  const lockedItemIds = new Set(cartItems?.map(ci => ci.item_id) || [])

  return (
    <main className="min-h-screen bg-surface">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">{shop.name}</h1>
              <p className="text-muted-foreground capitalize">
                {shop.shop_type.replace('_', ' ')} · {shop.economic_tier}
                {shop.price_modifier !== 1 && (
                  <span className="ml-2 text-sm">
                    ({shop.price_modifier > 1 ? '+' : ''}{Math.round((shop.price_modifier - 1) * 100)}% prices)
                  </span>
                )}
              </p>
            </div>
            <ShoppingBag characterId={character.id} shopId={shop.id} />
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Shop Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {shop.keeper_name}
            </CardTitle>
            <CardDescription className="capitalize">
              {shop.keeper_race}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {shop.location_descriptor && (
              <div>
                <h3 className="font-semibold mb-1">Location</h3>
                <p className="text-muted-foreground">{shop.location_descriptor}</p>
              </div>
            )}
            
            {shop.keeper_backstory && (
              <div>
                <h3 className="font-semibold mb-1">About the Keeper</h3>
                <p className="text-muted-foreground">{shop.keeper_backstory}</p>
              </div>
            )}

            {shop.keeper_motivation && (
              <div>
                <h3 className="font-semibold mb-1">Motivation</h3>
                <p className="text-muted-foreground">{shop.keeper_motivation}</p>
              </div>
            )}

            {shop.keeper_personality_traits && shop.keeper_personality_traits.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Personality</h3>
                <div className="flex flex-wrap gap-2">
                  {shop.keeper_personality_traits.map((trait, i) => (
                    <span key={i} className="px-2 py-1 bg-muted rounded text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {shop.haggle_enabled && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="w-4 h-4" />
                Haggling allowed (DC {shop.haggle_dc})
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Available Items
          </h2>
          
          {!items || items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No items available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {item.rarity}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-semibold">
                          {Math.round(item.base_price_gp * shop.price_modifier)} {currency}
                        </span>
                      </div>
                      
                      {item.weight_lbs && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Weight</span>
                          <span>{item.weight_lbs} lbs</span>
                        </div>
                      )}
                      
                      {item.stock_quantity !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">In Stock</span>
                          <span>{item.stock_quantity}</span>
                        </div>
                      )}
                    </div>

                    <AddToCartButton
                      characterId={character.id}
                      itemId={item.id}
                      shopId={shop.id}
                      itemName={item.name}
                      isLocked={lockedItemIds.has(item.id)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
