/**
 * Edit Town Page
 * @page /dm/towns/[townId]/edit
 * @auth Required - DM
 * @description Form for editing town details
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TownEditForm } from '@/components/dm/town-edit-form'

export default async function EditTownPage({
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

  // Fetch notable people for this town
  const { data: notablePeople } = await supabase
    .from('notable_people')
    .select('id, name, role')
    .eq('town_id', townId)
    .order('name', { ascending: true })

  return <TownEditForm town={town} notablePeople={notablePeople || []} />
}
