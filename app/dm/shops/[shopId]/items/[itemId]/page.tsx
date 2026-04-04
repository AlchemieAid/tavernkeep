import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ITEM_CATEGORIES, ITEM_RARITIES } from '@/lib/constants'

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ shopId: string; itemId: string }>
}) {
  const { shopId, itemId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get the item and verify ownership
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('shop_id', shopId)
    .single()

  if (itemError || !item) {
    notFound()
  }

  // Verify shop ownership
  const { data: shop } = await supabase
    .from('shops')
    .select('dm_id')
    .eq('id', shopId)
    .eq('dm_id', user.id)
    .single()

  if (!shop) {
    notFound()
  }

  async function updateItem(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const rarity = formData.get('rarity') as string
    const base_price_gp = parseFloat(formData.get('base_price_gp') as string)
    const stock_quantity = parseInt(formData.get('stock_quantity') as string)
    const is_hidden = formData.get('is_hidden') === 'on'
    const reveal_condition = formData.get('reveal_condition') as string || null

    const { error } = await supabase
      .from('items')
      .update({
        name,
        description,
        category,
        rarity,
        base_price_gp,
        stock_quantity,
        is_hidden,
        reveal_condition,
      })
      .eq('id', itemId)

    if (error) {
      console.error('Error updating item:', error)
      redirect(`/dm/shops/${shopId}?error=item_update_failed`)
    }

    revalidatePath(`/dm/shops/${shopId}`)
    redirect(`/dm/shops/${shopId}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Edit Item</h1>
        <p className="body-md text-on-surface-variant mt-2">
          Update item details for your shop
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateItem} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={item.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={item.description || ''}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={item.category} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rarity">Rarity</Label>
                <Select name="rarity" defaultValue={item.rarity} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_RARITIES.map((rarity) => (
                      <SelectItem key={rarity} value={rarity}>
                        {rarity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_price_gp">Base Price (GP)</Label>
                <Input
                  id="base_price_gp"
                  name="base_price_gp"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item.base_price_gp}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  defaultValue={item.stock_quantity}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_hidden"
                  name="is_hidden"
                  defaultChecked={item.is_hidden}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_hidden" className="cursor-pointer">
                  Hidden Item (requires reveal condition)
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reveal_condition">Reveal Condition</Label>
                <Input
                  id="reveal_condition"
                  name="reveal_condition"
                  defaultValue={item.reveal_condition || ''}
                  placeholder="e.g., Ask about rare artifacts"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="outline" asChild>
                <a href={`/dm/shops/${shopId}`}>Cancel</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
