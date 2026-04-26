import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAIClient } from '@/lib/ai'
import { GenerateMapsSchema } from '@/lib/validators/world'
import { buildMapGenerationPrompt } from '@/lib/prompts/mapGeneration'

export const maxDuration = 60

const MAX_GENERATIONS_PER_CAMPAIGN = 3 // batches (each batch = 3 maps)
const MAPS_PER_BATCH = 3

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('[MAP GEN] generate-maps POST called at', new Date().toISOString())

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[MAP GEN] Unauthorized request')
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[MAP GEN] Request body:', { ...body, dm_description: body.dm_description?.slice(0, 50) })

    const parsed = GenerateMapsSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[MAP GEN] Validation failed:', parsed.error.issues)
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { campaign_id, map_size, map_style, biome_profile, dm_description } = parsed.data
    console.log('[MAP GEN] Validated params:', { campaign_id, map_size, map_style, biome_profile })

    // Create AI client using unified interface
    let aiClient
    try {
      aiClient = createAIClient()
    } catch (error) {
      console.error('[MAP GEN] Failed to create AI client:', error)
      return NextResponse.json(
        { data: null, error: { message: 'AI service not configured' } },
        { status: 503 }
      )
    }

    console.log('[MAP GEN] Using AI provider:', aiClient.getProvider(), 'model:', aiClient.getModel())

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, dm_id')
      .eq('id', campaign_id)
      .eq('dm_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { data: null, error: { message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    const { count: existingCount } = await supabase
      .from('campaign_maps')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .eq('dm_id', user.id)

    const batchesUsed = Math.floor((existingCount ?? 0) / MAPS_PER_BATCH)
    if (batchesUsed >= MAX_GENERATIONS_PER_CAMPAIGN) {
      return NextResponse.json(
        { data: null, error: { message: `Maximum of ${MAX_GENERATIONS_PER_CAMPAIGN} map generations per campaign reached` } },
        { status: 429 }
      )
    }

    const prompt = buildMapGenerationPrompt({ map_size, map_style, biome_profile, dm_description })

    console.log('[MAP GEN] Generating 3 map images with prompt:', prompt.substring(0, 100))
    const imgStart = Date.now()
    const imageResults = await Promise.all(
      Array.from({ length: 3 }, () =>
        aiClient.generateImage({
          prompt,
          size: '1024x1024',
          count: 1,
          style: 'vivid'
        })
      )
    )
    console.log('[MAP GEN] Image generation took', Date.now() - imgStart, 'ms | results:', imageResults.length)

    const image_urls = imageResults.flatMap(r => r.urls).filter(Boolean) as string[]
    console.log('[MAP GEN] Got', image_urls.length, 'image URLs | types:', image_urls.map(u => u.startsWith('data:') ? 'data-url' : 'http-url'))

    const insertRows = image_urls.map(image_url => ({
      campaign_id,
      dm_id: user.id,
      image_url,
      map_size,
      map_style,
      biome_profile,
      creation_method: 'ai' as const,
      is_selected: false,
      setup_stage: 'created' as const,
      generation_count: (existingCount ?? 0) + 1,
    }))

    const { data: maps, error: insertError } = await supabase
      .from('campaign_maps')
      .insert(insertRows)
      .select()

    if (insertError) {
      console.error('[MAP GEN] DB insert failed:', insertError)
      return NextResponse.json(
        { data: null, error: { message: `Failed to save maps: ${insertError.message}` } },
        { status: 500 }
      )
    }

    console.log('[MAP GEN] Saved', maps?.length, 'maps to DB in', Date.now() - startTime, 'ms total')
    return NextResponse.json({ data: maps, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[MAP GEN] Unhandled error after', Date.now() - startTime, 'ms:', message, err)
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { map_id, campaign_id } = body as { map_id: string; campaign_id: string }

    if (!map_id || !campaign_id) {
      return NextResponse.json(
        { data: null, error: { message: 'map_id and campaign_id are required' } },
        { status: 400 }
      )
    }

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id')
      .eq('id', map_id)
      .eq('campaign_id', campaign_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      return NextResponse.json(
        { data: null, error: { message: 'Map not found' } },
        { status: 404 }
      )
    }

    await supabase
      .from('campaign_maps')
      .update({ is_selected: false })
      .eq('campaign_id', campaign_id)

    const { data: updated, error: updateError } = await supabase
      .from('campaign_maps')
      .update({ is_selected: true, setup_stage: 'created' })
      .eq('id', map_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { data: null, error: { message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updated, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
