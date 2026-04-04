import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RARITY_COLORS, SHOP_TYPE_LABELS, ECONOMIC_TIER_LABELS } from '@/lib/constants'

export default async function PlayerShopPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: shop, error } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !shop) {
    notFound()
  }

  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('shop_id', shop.id)
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .gt('stock_quantity', 0)
    .order('rarity', { ascending: false })
    .order('name', { ascending: true })

  const finalPrice = (basePrice: number) => {
    return Math.round(basePrice * shop.price_modifier)
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="headline-lg text-gold">{shop.name}</h1>
          <div className="flex items-center justify-center gap-4 body-md text-on-surface-variant">
            <span>{SHOP_TYPE_LABELS[shop.shop_type as keyof typeof SHOP_TYPE_LABELS]}</span>
            <span>·</span>
            <span>{ECONOMIC_TIER_LABELS[shop.economic_tier as keyof typeof ECONOMIC_TIER_LABELS]}</span>
          </div>
          {shop.location_descriptor && (
            <p className="body-md text-on-surface-variant">
              {shop.location_descriptor}
            </p>
          )}
          {shop.keeper_name && (
            <p className="body-sm text-muted">
              Proprietor: {shop.keeper_name}
              {shop.keeper_race && ` (${shop.keeper_race})`}
            </p>
          )}
        </div>

        {shop.keeper_backstory && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <p className="body-md text-on-surface-variant italic">
                "{shop.keeper_backstory}"
              </p>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="headline-sm text-on-surface mb-6 text-center">Available Wares</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items?.map((item) => (
              <Card key={item.id} className="hover:ring-1 hover:ring-gold transition-all">
                <CardHeader>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CardDescription>
                    <span className={RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS]}>
                      {item.rarity.replace('_', ' ')}
                    </span>
                    {' · '}
                    <span>{item.category.replace('_', ' ')}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.description && (
                    <p className="body-sm text-on-surface-variant">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-outline">
                    <span className="price text-lg">{finalPrice(item.base_price_gp)} gp</span>
                    <span className="body-sm text-muted">
                      {item.stock_quantity} in stock
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!items?.length && (
            <Card className="max-w-md mx-auto">
              <CardContent className="py-12 text-center">
                <p className="body-lg text-on-surface-variant">
                  The shelves are bare. Check back later!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {shop.haggle_enabled && (
          <Card className="max-w-2xl mx-auto bg-surface-container-low">
            <CardContent className="py-6 text-center">
              <p className="body-sm text-on-surface-variant">
                💬 The proprietor is open to negotiation (DC {shop.haggle_dc} Persuasion)
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
