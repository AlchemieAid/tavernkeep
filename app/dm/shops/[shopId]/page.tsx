import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { RARITY_COLORS } from '@/lib/constants'
import { DeleteMenu } from '@/components/shared/delete-menu'

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

  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('shop_id', shopId)
    .is('deleted_at', null)
    .order('added_at', { ascending: false })

  async function toggleActive() {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { shopId } = await params

    const { data: currentShop } = await supabase
      .from('shops')
      .select('is_active')
      .eq('id', shopId)
      .single()

    await supabase
      .from('shops')
      .update({ is_active: !currentShop?.is_active })
      .eq('id', shopId)
      .eq('dm_id', user.id)

    revalidatePath(`/dm/shops/${shopId}`)
  }

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

    revalidatePath(`/dm/shops/${shopId}`)
  }

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="headline-lg text-gold">{shop.name}</h1>
            <p className="body-md text-on-surface-variant mt-2">
              {shop.shop_type} · {shop.economic_tier}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <form action={toggleActive}>
              <Button 
                type="submit" 
                variant={shop.is_active ? 'default' : 'outline'}
              >
                {shop.is_active ? 'Active' : 'Inactive'}
              </Button>
            </form>
            {shop.is_active && (
              <Button asChild variant="outline">
                <Link href={`/dm/shops/${shopId}/qr`}>QR Code</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link href={`/dm/shops/${shopId}/items/new`}>Add Item</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/shop/${shop.slug}`} target="_blank">Preview Shop</Link>
          </Button>
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
                      {item.is_hidden && (
                        <span className="text-xs px-2 py-1 rounded-md bg-surface-container text-on-surface-variant">
                          Hidden
                        </span>
                      )}
                    </div>
                    <DeleteMenu
                      itemType="item"
                      itemId={item.id}
                      onDelete={async (id) => {
                        'use server'
                        await deleteItem(id)
                      }}
                    />
                  </div>
                  <CardDescription>
                    <span className={RARITY_COLORS[item.rarity]}>
                      {item.rarity}
                    </span>
                    {' · '}
                    {item.category}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="body-sm text-on-surface-variant">Price:</span>
                    <span className="price">{item.base_price_gp} gp</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-sm text-on-surface-variant">Stock:</span>
                    <span className="body-sm">{item.stock_quantity}</span>
                  </div>
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
