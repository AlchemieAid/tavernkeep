import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemLibraryForm } from '@/components/dm/item-library-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function NewItemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dm/items">← Item Library</Link>
        </Button>
      </div>
      <div>
        <h1 className="headline-lg text-gold">New Item</h1>
        <p className="body-md text-on-surface-variant mt-1">
          Fill in the mechanical details so the stats are accurate when players ask.
        </p>
      </div>
      <ItemLibraryForm />
    </div>
  )
}
