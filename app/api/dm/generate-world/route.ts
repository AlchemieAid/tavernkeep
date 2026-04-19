/**
 * World Generation Streaming API
 * POST /api/dm/generate-world
 * 
 * Streams real-time progress using Server-Sent Events (SSE)
 * Returns EventStream with live updates as world is built
 * 
 * Events:
 * - connected: Stream established
 * - step: { step: string, status: 'started'|'completed', details?: string }
 * - entity: { type: 'campaign'|'town'|'shop'|'notable_person'|'item', data: object }
 * - progress: { current: number, total: number, message: string }
 * - complete: { results: object }
 * - error: { message: string }
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrchestrator } from '@/lib/generation'
import { GenerateCampaignSchema } from '@/lib/validators/campaign'

export async function POST(request: NextRequest) {
  console.log('[API] /api/dm/generate-world POST request received')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('[API] Unauthorized request - no user')
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log('[API] Authenticated user:', user.id)

  // Verify OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('[API] OPENAI_API_KEY is not configured')
    return new Response(
      JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log('[API] OpenAI API key is configured')

  // Parse request
  const body = await request.json()
  console.log('[API] Request body parsed, prompt length:', body.prompt?.length)
  
  const validation = GenerateCampaignSchema.safeParse(body)
  
  if (!validation.success) {
    console.error('[API] Validation failed:', validation.error.errors)
    return new Response(
      JSON.stringify({ error: validation.error.errors[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { prompt, ruleset, setting } = validation.data
  const config = body.config
  
  console.log('[API] Request validated successfully')

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (e) {
          console.error('[API] Failed to send SSE event:', e)
        }
      }
      
      // Helper to flush events immediately (prevents buffering)
      const flush = () => {
        // In some environments, we need to send a flush comment
        try {
          controller.enqueue(encoder.encode(':flush\n\n'))
        } catch {
          // Ignore flush errors
        }
      }

      try {
        console.log('[API] Starting SSE stream')
        
        // Send connection confirmation
        send('connected', { message: 'World generation started' })
        console.log('[API] Sent connected event')

        // Create orchestrator with streaming callbacks
        console.log('[API] Creating orchestrator for user:', user.id)
        const orchestrator = createOrchestrator(user.id, user.id, {
          config,
          onProgress: (event: any) => {
            switch (event.type) {
              case 'step_started':
                send('step', {
                  step: event.step,
                  status: 'started',
                  details: event.details,
                  progress: { 
                    current: event.progress?.completedSteps || 0, 
                    total: event.progress?.totalSteps || 100 
                  }
                })
                flush()
                break

              case 'step_completed':
                send('step', {
                  step: event.step,
                  status: 'completed',
                  data: event.data,
                  progress: { 
                    current: event.progress?.completedSteps || 0, 
                    total: event.progress?.totalSteps || 100 
                  }
                })
                flush()
                break

              case 'entity_created':
                send('entity', {
                  type: event.entityType,
                  data: {
                    id: event.entity.id,
                    name: event.entity.name,
                    ...(event.entity.town_id && { townId: event.entity.town_id }),
                    ...(event.entity.shop_id && { shopId: event.entity.shop_id }),
                  }
                })
                flush()
                break

              case 'failed':
                send('error', { message: event.error })
                flush()
                controller.close()
                break

              case 'completed':
                send('complete', { results: event.results })
                flush()
                controller.close()
                break
            }
          }
        })

        // Start generation
        console.log('[API] Sending initial progress event')
        send('progress', { message: 'Initializing world generation...', current: 0, total: 100 })
        
        console.log('[API] Calling orchestrator.generateCampaign')
        const generationStart = Date.now()
        const result = await orchestrator.generateCampaign(prompt, ruleset, setting)
        const generationDuration = Date.now() - generationStart
        
        console.log(`[API] Generation completed in ${generationDuration}ms, success:`, result.success)

        if (!result.success) {
          console.error('[API] Generation failed:', result.error)
          send('error', { message: result.error })
          controller.close()
        } else {
          console.log('[API] Generation succeeded')
        }

      } catch (error) {
        console.error('[API] Streaming generation error:', error)
        console.error('[API] Error stack:', (error as Error).stack)
        send('error', { message: (error as Error).message })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
