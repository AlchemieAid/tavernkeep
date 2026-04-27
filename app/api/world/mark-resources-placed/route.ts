import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RequestSchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { map_id, campaign_id } = parsed.data

    const { error } = await supabase
      .from('campaign_maps')
      .update({ setup_stage: 'resources_placed' })
      .eq('id', map_id)
      .eq('campaign_id', campaign_id)
      .eq('dm_id', user.id)

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
