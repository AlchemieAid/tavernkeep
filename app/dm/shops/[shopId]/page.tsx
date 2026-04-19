/**
 * Shop Detail Page
 * @page /dm/shops/[shopId]
 * @auth Required - DM
 * @description Shop overview with inventory management and AI item generation
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { RARITY_COLORS } from '@/lib/constants'
import type { Database } from '@/lib/supabase/database.types'
import { DeleteMenu } from '@/components/shared/delete-menu'

type Shop = Database['public']['Tables']['shops']['Row'] & {
  campaign: Database['public']['Tables']['campaigns']['Row'] | null
}
type Item = Database['public']['Tables']['items']['Row']
import { Eye, EyeOff, Plus } from 'lucide-react'
import { VisibilityToggle } from '@/components/dm/visibility-toggle'
import { PendingTransactions } from '@/components/dm/pending-transactions'
import { ItemStatsDisplay } from '@/components/shared/item-stats-display'

export default async function ShopEditorPage({
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
    .select('*, campaign:campaigns(*)')
    .eq('id', shopId)
    .eq('dm_id', user.id)
    .single()

  if (error || !shop) {
    notFound()
  }

  const typedShop = shop as Shop

  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('shop_id', shopId)
    .is('deleted_at', null)
    .order('added_at', { ascending: true })
    .order('name', { ascending: true })

  // Helper to calculate final price with shop markup
  const getFinalPrice = (basePrice: number): number => {
    const modifier = typedShop.price_modifier ?? 100
    // modifier is stored as integer percentage (e.g., 110 = 110%)
    return Math.round(basePrice * (modifier / 100))
  }

  // Capture resolved shopId for server action closures
  const currentShopId = shopId

  async function deleteItem(itemId: string) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    await supabase
      .from('items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', itemId)

    revalidatePath(`/dm/shops/${currentShopId}`)
  }

  async function toggleItemVisibility(itemId: string, isRevealed: boolean) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error } = await supabase
      .from('items')
      .update({ is_revealed: isRevealed })
      .eq('id', itemId)

    if (error) {
      console.error('Error toggling item visibility:', error)
      throw error
    }

    revalidatePath(`/dm/shops/${currentShopId}`)
  }

  async function toggleShopVisibility(shopId: string, isRevealed: boolean) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error } = await supabase
      .from('shops')
      .update({ is_revealed: isRevealed })
      .eq('id', shopId)
      .eq('dm_id', user.id)

    if (error) {
      console.error('Error toggling shop visibility:', error)
      throw error
    }

    revalidatePath(`/dm/shops/${currentShopId}`)
  }

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="headline-lg text-gold">{typedShop.name}</h1>
            <p className="body-md text-on-surface-variant mt-2">
              {typedShop.shop_type} · {typedShop.economic_tier}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <VisibilityToggle
              entityType="shop"
              entityId={typedShop.id}
              isRevealed={typedShop.is_revealed}
              entityName={typedShop.name}
              onToggle={toggleShopVisibility}
            />
            <Button asChild>
              <Link href={`/dm/shops/${shopId}/edit`}>Edit Shop</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dm/shops/${shopId}/qr`}>QR Code</Link>
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link href={`/dm/shops/${shopId}/items/add`}>
              <Plus className="w-4 h-4 mr-2" />
              Add from Library
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/shop/${typedShop.slug}`} target="_blank">Preview Shop</Link>
          </Button>
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Pending Transactions</h2>
          <PendingTransactions shopId={shopId} />
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Inventory</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items?.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription>
                        <span className={RARITY_COLORS[item.rarity]}>
                          {item.rarity}
                        </span>
                        {' · '}
                        {item.category}
                        {item.is_hidden && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600">
                            Hidden Item
                          </span>
                        )}
                      </CardDescription>
                      {item.is_hidden && item.hidden_condition && (
                        <p className="text-xs text-on-surface-variant mt-1">
                          <strong>Reveal condition:</strong> {item.hidden_condition}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <VisibilityToggle
                        entityType="shop"
                        entityId={item.id}
                        isRevealed={item.is_revealed || false}
                        entityName={item.name}
                        onToggle={toggleItemVisibility}
                        variant="icon"
                      />
                      <DeleteMenu
                        itemType="item"
                        itemId={item.id}
                        onDelete={async (id) => {
                          'use server'
                          await deleteItem(id)
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.description && (
                    <p className="text-xs text-on-surface-variant line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <ItemStatsDisplay
                    category={item.category}
                    properties={item.properties as Record<string, unknown> | null}
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="body-sm text-on-surface-variant">Price:</span>
                    <p className="text-sm text-gold">
                      {getFinalPrice(item.base_price_gp)} {item.currency_reference || 'gp'}
                      {typedShop.price_modifier !== 100 && (
                        <span className="text-xs text-on-surface-variant ml-1">
                          ({item.base_price_gp} base)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-sm text-on-surface-variant">Stock:</span>
                    <span className="body-sm">{item.stock_quantity}</span>
                  </div>
                  {item.weight_lbs != null && item.weight_lbs > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="body-sm text-on-surface-variant">Weight:</span>
                      <span className="body-sm">{item.weight_lbs} lb</span>
                    </div>
                  )}
                  {(item.attunement_required || item.cursed) && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.attunement_required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          Attunement
                        </span>
                      )}
                      {item.cursed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                          Cursed
                        </span>
                      )}
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full mt-2">
                    <Link href={`/dm/shops/${shopId}/items/${item.id}`}>
                      Edit
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {!items?.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-lg text-on-surface-variant">
                  No items yet. Add your first item to stock the shop.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  )
}
