import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ITEM_CATEGORIES, ITEM_RARITIES } from '@/lib/constants'
import Link from 'next/link'

export default async function NewItemPage({
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

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .eq('dm_id', user.id)
    .single()

  if (!shop) {
    notFound()
  }

  async function createItem(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { shopId } = await params

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const rarity = formData.get('rarity') as string
    const base_price_gp = parseInt(formData.get('base_price_gp') as string)
    const stock_quantity = parseInt(formData.get('stock_quantity') as string)
    const is_hidden = formData.get('is_hidden') === 'on'
    const hidden_condition = formData.get('hidden_condition') as string || null

    const { error } = await supabase
      .from('items')
      .insert({
        shop_id: shopId,
        name,
        description,
        category,
        rarity,
        base_price_gp,
        stock_quantity,
        is_hidden,
        hidden_condition,
      })

    if (error) {
      console.error('Error creating item:', error)
      redirect(`/dm/shops/${shopId}?error=item_create_failed`)
    }

    redirect(`/dm/shops/${shopId}`)
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href={`/dm/shops/${shopId}`} className="body-md text-gold hover:underline">
            ← Back to Shop
          </Link>
          <h1 className="headline-lg text-gold mt-4">Add Item</h1>
          <p className="body-md text-on-surface-variant mt-2">
            {shop.name}
          </p>
        </div>

        <form action={createItem} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Potion of Healing"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="flex w-full rounded-md bg-surface-container-lowest px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                  placeholder="A magical red liquid that restores 2d4+2 hit points when consumed."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    className="flex h-9 w-full rounded-md bg-surface-container-lowest px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                    required
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rarity">Rarity</Label>
                  <select
                    id="rarity"
                    name="rarity"
                    className="flex h-9 w-full rounded-md bg-surface-container-lowest px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                    required
                  >
                    {ITEM_RARITIES.map((rar) => (
                      <option key={rar} value={rar}>
                        {rar.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price_gp">Price (gp)</Label>
                  <Input
                    type="number"
                    id="base_price_gp"
                    name="base_price_gp"
                    min="0"
                    defaultValue="50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    type="number"
                    id="stock_quantity"
                    name="stock_quantity"
                    min="0"
                    defaultValue="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_hidden"
                    name="is_hidden"
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_hidden">Hidden Item</Label>
                </div>
                <p className="body-sm text-muted">
                  Hidden items won't appear to players unless revealed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hidden_condition">Reveal Condition (optional)</Label>
                <Input
                  id="hidden_condition"
                  name="hidden_condition"
                  placeholder="DC 15 Perception check"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit">Add Item</Button>
            <Button asChild variant="outline">
              <Link href={`/dm/shops/${shopId}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
