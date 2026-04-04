import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { DeleteMenu } from '@/components/shared/delete-menu'

export default async function TownPage({
  params,
}: {
  params: Promise<{ townId: string }>
}) {
  const { townId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: town, error } = await supabase
    .from('towns')
    .select('*')
    .eq('id', townId)
    .eq('dm_id', user.id)
    .single()

  if (error || !town) {
    notFound()
  }

  const { data: shops } = await supabase
    .from('shops')
    .select('*')
    .eq('town_id', townId)
    .order('created_at', { ascending: false })

  const activeShop = shops?.find(s => s.is_active)

  async function deleteShop(shopId: string) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    await supabase
      .from('shops')
      .delete()
      .eq('id', shopId)
      .eq('dm_id', user.id)

    revalidatePath(`/dm/towns/${townId}`)
  }

  return (
    <div className="space-y-8">
        <div>
          <h1 className="headline-lg text-gold">{town.name}</h1>
          {town.description && (
            <p className="body-md text-on-surface-variant mt-2">
              {town.description}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link href={`/dm/towns/${townId}/shops/new`}>Create Shop</Link>
          </Button>
          {activeShop && (
            <Button asChild variant="outline">
              <Link href={`/dm/shops/${activeShop.id}/qr`}>
                View Active Shop QR Code
              </Link>
            </Button>
          )}
        </div>

        <div>
          <h2 className="headline-sm text-on-surface mb-4">Shops</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shops?.map((shop) => (
              <Card key={shop.id} className={shop.is_active ? 'ring-2 ring-gold' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{shop.name}</CardTitle>
                      {shop.is_active && (
                        <span className="text-xs px-2 py-1 rounded-md bg-gold text-on-gold">
                          Active
                        </span>
                      )}
                    </div>
                    <DeleteMenu
                      itemType="shop"
                      itemId={shop.id}
                      onDelete={async (id) => {
                        'use server'
                        await deleteShop(id)
                      }}
                    />
                  </div>
                  <CardDescription>
                    {shop.shop_type} · {shop.economic_tier}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/dm/shops/${shop.id}`}>
                      Manage Shop
                    </Link>
                  </Button>
                  {shop.is_active && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/shop/${shop.slug}`} target="_blank">
                        Preview Shop
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {!shops?.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="body-lg text-on-surface-variant">
                  No shops yet. Create your first shop for this town.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  )
}
