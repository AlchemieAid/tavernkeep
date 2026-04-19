import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { GenerateMapsSchema } from '@/lib/validators/world'
import { buildMapGenerationPrompt } from '@/lib/prompts/mapGeneration'

const MAX_GENERATIONS_PER_CAMPAIGN = 3

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

    const body = await request.json()
    const parsed = GenerateMapsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { campaign_id, map_size, map_style, biome_profile, dm_description } = parsed.data

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { data: null, error: { message: 'AI image service not configured' } },
        { status: 503 }
      )
    }

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

    if ((existingCount ?? 0) >= MAX_GENERATIONS_PER_CAMPAIGN) {
      return NextResponse.json(
        { data: null, error: { message: `Maximum of ${MAX_GENERATIONS_PER_CAMPAIGN} map generations per campaign reached` } },
        { status: 429 }
      )
    }

    const openai = new OpenAI({ apiKey })
    const prompt = buildMapGenerationPrompt({ map_size, map_style, biome_profile, dm_description })

    const imageResults = await Promise.all(
      Array.from({ length: 3 }, () =>
        openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'url',
        })
      )
    )

    const image_urls = imageResults.map(r => r.data?.[0]?.url).filter(Boolean) as string[]

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
      return NextResponse.json(
        { data: null, error: { message: `Failed to save maps: ${insertError.message}` } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: maps, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
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
      .update({ is_selected: true, setup_stage: 'selected' })
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
