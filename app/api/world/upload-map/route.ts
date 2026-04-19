import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UploadMapSchema } from '@/lib/validators/world'

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const meta = formData.get('meta') as string | null

    if (!file) {
      return NextResponse.json(
        { data: null, error: { message: 'No file provided' } },
        { status: 400 }
      )
    }

    const metaParsed = UploadMapSchema.safeParse(JSON.parse(meta ?? '{}'))
    if (!metaParsed.success) {
      return NextResponse.json(
        { data: null, error: { message: metaParsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { campaign_id, map_size, map_style, biome_profile } = metaParsed.data

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('dm_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { data: null, error: { message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    const ext = file.name.split('.').pop() ?? 'png'
    const storagePath = `campaign-maps/${user.id}/${campaign_id}/${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('maps')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { data: null, error: { message: `Upload failed: ${uploadError.message}` } },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabase.storage.from('maps').getPublicUrl(storagePath)

    const { data: newMap, error: insertError } = await supabase
      .from('campaign_maps')
      .insert({
        campaign_id,
        dm_id: user.id,
        image_url: publicUrl,
        map_size,
        map_style: map_style ?? null,
        biome_profile: biome_profile ?? null,
        creation_method: 'uploaded',
        is_selected: false,
        original_filename: file.name,
        setup_stage: 'created',
      })
      .select()
      .single()

    if (insertError || !newMap) {
      return NextResponse.json(
        { data: null, error: { message: `Failed to record map: ${insertError?.message}` } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: newMap, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
