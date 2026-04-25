import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClassifyTerrainSchema } from '@/lib/validators/world'
import OpenAI from 'openai'
import { runTerrainPipeline, type PipelineEvent } from '@/lib/world/terrainPipeline'

export const maxDuration = 120

function sseChunk(event: PipelineEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('[TERRAIN] classify-terrain (pipeline) called at', new Date().toISOString())

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
  }

  const body = await request.json()
  const parsed = ClassifyTerrainSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0].message } },
      { status: 400 }
    )
  }
  const { map_id, image_url } = parsed.data

  const { data: map, error: mapError } = await supabase
    .from('campaign_maps')
    .select('id, dm_id, campaign_id, map_size, biome_profile, setup_stage')
    .eq('id', map_id)
    .eq('dm_id', user.id)
    .single()

  if (mapError || !map) {
    return NextResponse.json({ data: null, error: { message: 'Map not found' } }, { status: 404 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { data: null, error: { message: 'AI vision service not configured (missing OPENAI_API_KEY)' } },
      { status: 503 }
    )
  }

  const openai = new OpenAI({ apiKey })

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (event: PipelineEvent) => controller.enqueue(enc.encode(sseChunk(event)))

      try {
        const pipeline = runTerrainPipeline({
          mapId: map_id,
          imageUrl: image_url,
          mapSize: (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
          biomeProfile: map.biome_profile ?? null,
          campaignId: map.campaign_id,
          dmId: map.dm_id,
          openai,
          supabase,
        })

        for await (const event of pipeline) {
          send(event)
          if (event.type === 'complete' || event.type === 'error') break
        }

        console.log('[TERRAIN] Pipeline complete in', Date.now() - startTime, 'ms')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[TERRAIN] Pipeline unhandled error:', message)
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
