/**
 * Item Library Page
 * @page /dm/items
 * @auth Required - DM
 * @description Browse and manage DM's personal item library with SRD catalog
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemLibraryBrowser } from '@/components/dm/item-library-browser'

export default async function ItemLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch custom items from DM's library
  const { data: customItems } = await supabase
    .from('item_library')
    .select('*')
    .eq('dm_id', user.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  // Fetch SRD catalog items (5e ruleset)
  const { data: catalogItems } = await supabase
    .from('catalog_items')
    .select('*')
    .eq('ruleset', '5e')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  // Normalize custom items
  const normalizedCustom = (customItems ?? []).map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    rarity: item.rarity,
    base_price_gp: item.base_price_gp,
    weight_lbs: item.weight_lbs,
    attunement_required: item.attunement_required,
    shop_tags: item.shop_tags,
    properties: item.properties,
    source: 'custom' as const,
  }))

  // Normalize catalog items
  const normalizedCatalog = (catalogItems ?? []).map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    rarity: item.rarity,
    base_price: item.base_price,
    price_currency: item.price_currency,
    weight: item.weight,
    requires_attunement: item.requires_attunement,
    shop_tags: item.shop_tags,
    system_stats: item.system_stats,
    source: 'srd' as const,
  }))

  return (
    <ItemLibraryBrowser 
      customItems={normalizedCustom} 
      catalogItems={normalizedCatalog}
    />
  )
}
