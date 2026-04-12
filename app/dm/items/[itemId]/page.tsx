import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemLibraryForm } from '@/components/dm/item-library-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { ItemLibrary } from '@/types/database'

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawItem, error } = await supabase
    .from('item_library')
    .select('*')
    .eq('id', itemId)
    .eq('dm_id', user.id)
    .single()

  if (error || !rawItem) notFound()

  const item = rawItem as ItemLibrary

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dm/items">← Item Library</Link>
        </Button>
      </div>
      <div>
        <h1 className="headline-lg text-gold">Edit: {item.name}</h1>
        <p className="body-md text-on-surface-variant mt-1">
          Update mechanical stats, shop tags, or lore.
        </p>
      </div>
      <ItemLibraryForm item={item} />
    </div>
  )
}
