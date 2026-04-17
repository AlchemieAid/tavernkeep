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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Verify OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured')
    return new Response(
      JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Parse request
  const body = await request.json()
  const validation = GenerateCampaignSchema.safeParse(body)
  
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: validation.error.errors[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { prompt, ruleset, setting } = validation.data
  const config = body.config

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Send connection confirmation
        send('connected', { message: 'World generation started' })

        let stepCount = 0
        const totalSteps = 15 // Approximate: 1 campaign + ~3 towns + ~4 shops + ~4 people + ~12 items

        // Create orchestrator with streaming callbacks
        const orchestrator = createOrchestrator(user.id, user.id, {
          config,
          onProgress: (event: any) => {
            switch (event.type) {
              case 'step_started':
                stepCount++
                send('step', {
                  step: event.step,
                  status: 'started',
                  details: event.details,
                  progress: { current: stepCount, total: totalSteps }
                })
                break

              case 'step_completed':
                send('step', {
                  step: event.step,
                  status: 'completed',
                  data: event.data,
                  progress: { current: stepCount, total: totalSteps }
                })
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
                break

              case 'failed':
                send('error', { message: event.error })
                controller.close()
                break

              case 'completed':
                send('complete', { results: event.results })
                controller.close()
                break
            }
          }
        })

        // Start generation
        send('progress', { message: 'Initializing world generation...', current: 0, total: totalSteps })
        
        const result = await orchestrator.generateCampaign(prompt, ruleset, setting)

        if (!result.success) {
          send('error', { message: result.error })
          controller.close()
        }

      } catch (error) {
        console.error('Streaming generation error:', error)
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
