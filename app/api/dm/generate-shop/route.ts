import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createOrchestrator } from '@/lib/generation/orchestrator'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { campaignId, townId, prompt, createNotablePerson = true, notablePersonId } = await request.json()

    if (!campaignId || !prompt) {
      return NextResponse.json(
        { data: null, error: { message: 'Campaign ID and prompt are required' } },
        { status: 400 }
      )
    }

    // Verify OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { data: null, error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    // Verify campaign ownership
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('dm_id', user.id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { data: null, error: { message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    // Verify town ownership if townId is provided
    if (townId) {
      const { data: town } = await supabase
        .from('towns')
        .select('id')
        .eq('id', townId)
        .eq('dm_id', user.id)
        .single()

      if (!town) {
        return NextResponse.json(
          { data: null, error: { message: 'Town not found' } },
          { status: 404 }
        )
      }
    }

    // Use orchestrator for cascading generation: Shop → Items
    console.log('[SHOP API] Starting orchestrator-based shop generation with cascade')
    const orchestrator = createOrchestrator(user.id, user.id)
    const result = await orchestrator.generateShop(campaignId, townId || null, prompt, createNotablePerson, notablePersonId)

    if (!result.success) {
      return NextResponse.json(
        { data: null, error: { message: result.error || 'Shop generation failed' } },
        { status: 500 }
      )
    }

    // Return results in expected format (for backward compatibility with UI)
    return NextResponse.json({
      data: { 
        shopId: result.data.shops?.[0]?.id,
        shop: result.data.shops?.[0],
        items: result.data.items || [],
        itemsCreated: (result.data.items?.length || 0) > 0
      },
      error: null
    })
  } catch (error) {
    console.error('Error generating shop:', error)
    return NextResponse.json(
      { data: null, error: { message: 'Failed to generate shop' } },
      { status: 500 }
    )
  }
}
