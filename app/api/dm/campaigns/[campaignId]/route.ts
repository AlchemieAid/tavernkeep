import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateCampaignSchema } from '@/lib/validators'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Validate request body with Zod
    const body = await request.json()
    const validation = UpdateCampaignSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { message: validation.error.errors[0].message } },
        { status: 400 }
      )
    }

    // Update campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(validation.data as unknown as Record<string, unknown>)
      .eq('id', campaignId)
      .eq('dm_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json(
        { data: null, error: { message: 'Failed to update campaign' } },
        { status: 500 }
      )
    }

    if (!campaign) {
      return NextResponse.json(
        { data: null, error: { message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      data: campaign,
      error: null
    })
  } catch (error) {
    console.error('Campaign update failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
