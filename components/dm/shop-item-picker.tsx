/**
 * Shop Item Picker
 * 
 * @fileoverview
 * Interface for adding existing items from DM's library to a shop.
 * Includes search, filtering by category/rarity, and stock quantity management.
 * 
 * @features
 * - Search by item name
 * - Filter by category and rarity
 * - Stock quantity input
 * - Real-time filtering with useMemo
 * - Adds items to shop inventory
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Search } from 'lucide-react'
import { RARITY_COLORS } from '@/lib/constants'

import type { Json } from '@/lib/supabase/database.types'

interface PickerItem {
  id: string
  name: string
  description: string | null
  category: string
  rarity: string
  base_price_gp: number
  weight_lbs: number | null
  attunement_required: boolean
  properties: Json
  source: 'library' | 'catalog'
}

interface ShopItemPickerProps {
  shopId: string
  libraryItems: PickerItem[]
  catalogItems: PickerItem[]
  shopType: string
}

const CATEGORY_LABELS: Record<string, string> = {
  weapon: 'Weapon', armor: 'Armor', potion: 'Potion',
  scroll: 'Scroll', tool: 'Tool', magic_item: 'Magic Item', misc: 'Misc',
}

export function ShopItemPicker({ shopId, libraryItems, catalogItems, shopType }: ShopItemPickerProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allItems = useMemo(() => [
    ...libraryItems.map(i => ({ ...i, source: 'library' as const })),
    ...catalogItems.map(i => ({ ...i, source: 'catalog' as const })),
  ], [libraryItems, catalogItems])

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false
      return true
    })
  }, [allItems, search, categoryFilter, sourceFilter])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (!quantities[id]) setQuantities(q => ({ ...q, [id]: 1 }))
      }
      return next
    })
  }

  const handleAdd = async () => {
    if (selected.size === 0) return
    setIsAdding(true)
    setError(null)

    const selectedItems = allItems.filter(i => selected.has(i.id))
    const payload = selectedItems.map(item => ({
      shop_id: shopId,
      name: item.name,
      description: item.description,
      category: item.category,
      rarity: item.rarity,
      base_price_gp: item.base_price_gp,
      stock_quantity: quantities[item.id] ?? 1,
      weight_lbs: item.weight_lbs,
      is_hidden: false,
      is_revealed: true,
      hidden_condition: null,
      attunement_required: item.attunement_required,
      cursed: false,
      identified: true,
      properties: item.properties,
      source: 'library',
      currency_reference: 'gp',
    }))

    try {
      const res = await fetch(`/api/dm/shops/${shopId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      const json = await res.json() as { data: unknown; error: { message: string } | null }
      if (!res.ok || json.error) {
        setError(json.error?.message ?? 'Failed to add items')
      } else {
        router.push(`/dm/shops/${shopId}`)
        router.refresh()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-error/10 border border-error/30 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48 space-y-1.5">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              id="search"
              className="pl-8"
              placeholder="Item name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="library">My Library</SelectItem>
              <SelectItem value="catalog">SRD Catalog</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-20 z-10 flex items-center justify-between gap-4 rounded-lg bg-primary/10 border border-primary/30 px-4 py-3">
          <p className="text-sm font-medium">{selected.size} item{selected.size !== 1 ? 's' : ''} selected</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={isAdding}>
              {isAdding
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Plus className="w-4 h-4 mr-2" />
              }
              Add to Shop
            </Button>
          </div>
        </div>
      )}

      {/* Item grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-on-surface-variant py-12">No items match your filters.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => {
            const isSelected = selected.has(item.id)
            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-gold'}`}
                onClick={() => toggle(item.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        <span className={RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS]}>
                          {item.rarity.replace('_', ' ')}
                        </span>
                        {' · '}
                        {CATEGORY_LABELS[item.category] ?? item.category}
                        {' · '}
                        {item.base_price_gp} gp
                      </CardDescription>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      item.source === 'library'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {item.source === 'library' ? 'Library' : 'SRD'}
                    </span>
                  </div>
                </CardHeader>
                {isSelected && (
                  <CardContent className="pt-0" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`qty-${item.id}`} className="text-xs shrink-0">Qty:</Label>
                      <Input
                        id={`qty-${item.id}`}
                        type="number"
                        min={1}
                        max={99}
                        className="h-7 text-xs w-16"
                        value={quantities[item.id] ?? 1}
                        onChange={e => setQuantities(q => ({ ...q, [item.id]: Number(e.target.value) || 1 }))}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
