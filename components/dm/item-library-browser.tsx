/**
 * Item Library Browser
 * 
 * @fileoverview
 * Filterable browser for DM's personal item library and SRD catalog.
 * Provides intuitive search and filtering similar to shop item picker.
 * 
 * @features
 * - Search by item name
 * - Filter by category, rarity, and source (custom vs SRD)
 * - Real-time filtering with useMemo
 * - Grouped display by category
 * - Edit custom items, view SRD items
 */

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, BookOpen, Plus } from 'lucide-react'
import { RARITY_COLORS } from '@/lib/constants'

interface LibraryItem {
  id: string
  name: string
  description: string | null
  category: string
  rarity: string
  base_price_gp?: number
  base_price?: number
  price_currency?: string
  weight_lbs?: number | null
  weight?: number | null
  attunement_required?: boolean
  requires_attunement?: boolean
  shop_tags: string[]
  source: 'custom' | 'srd'
}

interface ItemLibraryBrowserProps {
  customItems: LibraryItem[]
  catalogItems: LibraryItem[]
}

const CATEGORY_LABELS: Record<string, string> = {
  weapon: 'Weapons',
  armor: 'Armor',
  potion: 'Potions',
  scroll: 'Scrolls',
  tool: 'Tools',
  magic_item: 'Magic Items',
  misc: 'Miscellaneous',
}

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'very_rare', 'legendary']

export function ItemLibraryBrowser({ customItems, catalogItems }: ItemLibraryBrowserProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [rarityFilter, setRarityFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')

  // Combine and normalize items
  const allItems = useMemo(() => {
    const custom = customItems.map(i => ({
      ...i,
      price: i.base_price_gp ?? 0,
      weight: i.weight_lbs ?? null,
      attunement: i.attunement_required ?? false,
      source: 'custom' as const,
    }))
    const catalog = catalogItems.map(i => ({
      ...i,
      price: i.base_price ?? 0,
      weight: i.weight ?? null,
      attunement: i.requires_attunement ?? false,
      source: 'srd' as const,
    }))
    return [...custom, ...catalog]
  }, [customItems, catalogItems])

  // Filter items
  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false
      return true
    })
  }, [allItems, search, categoryFilter, rarityFilter, sourceFilter])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    })
    // Sort items within each group by rarity then name
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const rarityDiff = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
        if (rarityDiff !== 0) return rarityDiff
        return a.name.localeCompare(b.name)
      })
    })
    return groups
  }, [filtered])

  const totalCount = allItems.length
  const customCount = customItems.length
  const catalogCount = catalogItems.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="headline-lg text-gold">Item Library</h1>
          <p className="body-md text-on-surface-variant mt-1">
            {totalCount} total items · {customCount} custom · {catalogCount} SRD catalog
          </p>
        </div>
        <Button asChild>
          <Link href="/dm/items/new">
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Link>
        </Button>
      </div>

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
          <Label>Rarity</Label>
          <Select value={rarityFilter} onValueChange={setRarityFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="uncommon">Uncommon</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="very_rare">Very Rare</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="custom">My Custom</SelectItem>
              <SelectItem value="srd">SRD Catalog</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <BookOpen className="w-12 h-12 mx-auto text-muted" />
            <div>
              <p className="headline-sm text-on-surface">No items match your filters</p>
              <p className="body-md text-on-surface-variant mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h2 className="headline-sm text-on-surface mb-4">
                {CATEGORY_LABELS[cat] ?? cat} ({catItems.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {catItems.map((item) => (
                  <Card 
                    key={`${item.source}-${item.id}`} 
                    className="hover:border-gold transition-colors"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-xs font-medium ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] ?? 'text-on-surface'}`}>
                            {item.rarity.replace('_', ' ')}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            item.source === 'custom'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-surface-variant text-on-surface-variant'
                          }`}>
                            {item.source === 'custom' ? 'Custom' : 'SRD'}
                          </span>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        {item.price} {item.price_currency ?? 'gp'}
                        {item.weight ? ` · ${item.weight} lb` : ''}
                        {item.attunement ? ' · Attunement' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {item.description && (
                        <p className="text-xs text-on-surface-variant line-clamp-2">{item.description}</p>
                      )}
                      {item.shop_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.shop_tags.slice(0, 3).map(tag => (
                            <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-surface-variant text-on-surface-variant capitalize">
                              {tag.replace('_', ' ')}
                            </span>
                          ))}
                          {item.shop_tags.length > 3 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-surface-variant text-on-surface-variant">
                              +{item.shop_tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {item.source === 'custom' ? (
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link href={`/dm/items/${item.id}`}>Edit</Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="w-full" disabled>
                          SRD Reference
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
