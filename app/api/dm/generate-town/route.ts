import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const { campaignId, prompt } = await request.json()

    if (!campaignId || !prompt) {
      return NextResponse.json(
        { data: null, error: { message: 'Campaign ID and prompt are required' } },
        { status: 400 }
      )
    }

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

    // Use orchestrator for cascading generation: Town → Shops → People → Items
    console.log('[TOWN API] Starting orchestrator-based town generation with cascade')
    const orchestrator = createOrchestrator(user.id, user.id)
    const result = await orchestrator.generateTown(campaignId, prompt)

    if (!result.success) {
      return NextResponse.json(
        { data: null, error: { message: result.error || 'Town generation failed' } },
        { status: 500 }
      )
    }

    // Return results in expected format
    return NextResponse.json({ 
      data: {
        town: result.data.town,
        shops: result.data.shops || [],
        notablePeople: result.data.notablePeople || [],
        items: result.data.items || []
      },
      error: null
    })
  } catch (error) {
    console.error('AI town generation failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
