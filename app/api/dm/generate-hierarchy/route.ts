/**
 * Hierarchical Generation API
 * POST /api/dm/generate-hierarchy
 * 
 * Generates a complete campaign hierarchy:
 * Campaign → Towns → (Shops + Notable People) → Items
 * 
 * Body: {
 *   prompt: string
 *   ruleset?: string
 *   setting?: string
 *   config?: Partial<GenerationConfig>
 * }
 * 
 * Returns: GenerationProgress with all created entities
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrchestrator } from '@/lib/generation'
import { GenerateCampaignSchema } from '@/lib/validators/campaign'

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

    // Parse request body
    const body = await request.json()
    
    // Validate with schema
    const validation = GenerateCampaignSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { message: validation.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { prompt, ruleset, setting } = validation.data
    const config = body.config // Optional config for generation counts

    // Create orchestrator with optional custom config
    const orchestrator = createOrchestrator(user.id, user.id, {
      config,
      onProgress: (event) => {
        // In production, this could stream via WebSocket or SSE
        console.log(`[Generation Progress] ${event.type}:`, 
          event.type === 'step_started' ? event.step :
          event.type === 'step_completed' ? `${event.step} ✓` :
          event.type === 'step_failed' ? `${event.step} ✗ ${event.error}` :
          event.type
        )
      }
    })

    // Generate complete hierarchy
    const result = await orchestrator.generateCampaign(prompt, ruleset, setting)

    if (!result.success) {
      return NextResponse.json(
        { data: null, error: { message: result.error } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: result.data,
      error: null
    })

  } catch (error) {
    console.error('Hierarchical generation failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
