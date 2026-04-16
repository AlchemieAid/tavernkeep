/**
 * Item Library Page
 * @page /dm/items
 * @auth Required - DM
 * @description Browse and manage DM's personal item library
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'
import { RARITY_COLORS } from '@/lib/constants'
import type { ItemLibrary } from '@/types/database'

export default async function ItemLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawItems } = await supabase
    .from('item_library')
    .select('*')
    .eq('dm_id', user.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const items = rawItems as ItemLibrary[] | null

  const grouped = (items ?? []).reduce<Record<string, ItemLibrary[]>>((acc, item) => {
    const key = item.category
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const categoryLabels: Record<string, string> = {
    weapon: 'Weapons',
    armor: 'Armor',
    potion: 'Potions',
    scroll: 'Scrolls',
    tool: 'Tools',
    magic_item: 'Magic Items',
    misc: 'Miscellaneous',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="headline-lg text-gold">Item Library</h1>
          <p className="body-md text-on-surface-variant mt-1">
            Your validated item catalog — {items?.length ?? 0} items. Add items here first, then stock your shops from this library.
          </p>
        </div>
        <Button asChild>
          <Link href="/dm/items/new">
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Link>
        </Button>
      </div>

      {(!items || items.length === 0) ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <BookOpen className="w-12 h-12 mx-auto text-muted" />
            <div>
              <p className="headline-sm text-on-surface">Your library is empty</p>
              <p className="body-md text-on-surface-variant mt-1">
                Create items with full mechanical stats — damage dice, AC, healing, spell level, charges, and more.
                Shops will pull their inventory from here and the SRD catalog.
              </p>
            </div>
            <Button asChild>
              <Link href="/dm/items/new">
                <Plus className="w-4 h-4 mr-2" />
                Create your first item
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h2 className="headline-sm text-on-surface mb-4">{categoryLabels[cat] ?? cat}</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {catItems.map((item) => (
                <Card key={item.id} className="hover:border-gold transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                      <span className={`text-xs font-medium shrink-0 ${RARITY_COLORS[item.rarity]}`}>
                        {item.rarity.replace('_', ' ')}
                      </span>
                    </div>
                    <CardDescription className="text-xs">
                      {item.base_price_gp} gp
                      {item.weight_lbs ? ` · ${item.weight_lbs} lb` : ''}
                      {item.attunement_required ? ' · Attunement' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {item.description && (
                      <p className="text-xs text-on-surface-variant line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {item.shop_tags.map(tag => (
                        <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-surface-variant text-on-surface-variant capitalize">
                          {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/dm/items/${item.id}`}>Edit</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
