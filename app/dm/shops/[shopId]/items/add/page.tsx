import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShopItemPicker } from '@/components/dm/shop-item-picker'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { ItemLibrary } from '@/types/database'

interface PickerItem {
  id: string
  name: string
  description: string | null
  category: string
  rarity: string
  base_price_gp: number
  weight_lbs: number | null
  attunement_required: boolean
  properties: Record<string, unknown> | null
  source: 'library' | 'catalog'
}

export default async function AddItemsToShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawShop, error } = await supabase
    .from('shops')
    .select('id, name, shop_type')
    .eq('id', shopId)
    .eq('dm_id', user.id)
    .single()

  if (error || !rawShop) notFound()
  const shop = rawShop as { id: string; name: string; shop_type: string }

  // Fetch DM's library items tagged for this shop type
  const { data: rawLibrary } = await supabase
    .from('item_library')
    .select('*')
    .eq('dm_id', user.id)
    .order('name', { ascending: true })

  const libraryItems: PickerItem[] = ((rawLibrary as ItemLibrary[] | null) ?? []).map(i => ({
    id: i.id,
    name: i.name,
    description: i.description,
    category: i.category,
    rarity: i.rarity,
    base_price_gp: i.base_price_gp,
    weight_lbs: i.weight_lbs,
    attunement_required: i.attunement_required,
    properties: i.properties,
    source: 'library',
  }))

  // Fetch SRD catalog items
  const { data: rawCatalog } = await supabase
    .from('catalog_items')
    .select('id, name, description, category, rarity, base_price, weight, requires_attunement, system_stats')
    .eq('ruleset', '5e')
    .order('name', { ascending: true })

  const catalogItems: PickerItem[] = (rawCatalog ?? []).map((i: {
    id: string
    name: string
    description: string | null
    category: string
    rarity: string
    base_price: number
    weight: number | null
    requires_attunement: boolean
    system_stats: Record<string, unknown> | null
  }) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    category: i.category,
    rarity: i.rarity,
    base_price_gp: i.base_price,
    weight_lbs: i.weight,
    attunement_required: i.requires_attunement,
    properties: i.system_stats,
    source: 'catalog',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dm/shops/${shopId}`}>← Back to {shop.name}</Link>
        </Button>
      </div>
      <div>
        <h1 className="headline-lg text-gold">Add Items to {shop.name}</h1>
        <p className="body-md text-on-surface-variant mt-1">
          Click items to select them, set quantities, then click &ldquo;Add to Shop&rdquo;.
          Library items have your custom stats; SRD items come from the catalog.
        </p>
      </div>
      <ShopItemPicker
        shopId={shopId}
        libraryItems={libraryItems}
        catalogItems={catalogItems}
        shopType={shop.shop_type}
      />
    </div>
  )
}
