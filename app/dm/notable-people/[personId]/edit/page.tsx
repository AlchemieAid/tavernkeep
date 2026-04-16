/**
 * Edit Notable Person Page
 * @page /dm/notable-people/[personId]/edit
 * @auth Required - DM
 * @description Form for editing NPC details
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotablePersonEditForm } from '@/components/dm/notable-person-edit-form'

export default async function EditNotablePersonPage({
  params,
}: {
  params: Promise<{ personId: string }>
}) {
  const { personId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: person, error } = await supabase
    .from('notable_people')
    .select('*')
    .eq('id', personId)
    .eq('dm_id', user.id)
    .single()

  if (error || !person) {
    notFound()
  }

  return <NotablePersonEditForm person={person} townId={person.town_id} />
}
