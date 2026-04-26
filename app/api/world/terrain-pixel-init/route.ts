import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { buildPixelCache } from '@/lib/world/terrainSeeds'
import { getPixelCache, setPixelCache } from '@/lib/world/terrainPixelCache'

export const maxDuration = 60

const RequestSchema = z.object({
  map_id: z.string().uuid(),
  image_url: z.string().refine(
    (v) => v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:'),
    { message: 'image_url must be an HTTP URL or data URI' }
  ),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })
  }

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0].message } },
      { status: 400 }
    )
  }
  const { map_id, image_url } = parsed.data

  const { data: map, error: mapError } = await supabase
    .from('campaign_maps')
    .select('id')
    .eq('id', map_id)
    .eq('dm_id', user.id)
    .single()

  if (mapError || !map) {
    return NextResponse.json({ data: null, error: { message: 'Map not found' } }, { status: 404 })
  }

  const existing = getPixelCache(map_id)
  if (existing) {
    return NextResponse.json({ data: { cached: true, warm: true }, error: null })
  }

  try {
    const cache = await buildPixelCache(image_url)
    setPixelCache(map_id, cache)
    return NextResponse.json({ data: { cached: true, warm: false }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cache build failed'
    console.error('[TERRAIN-PIXEL-INIT]', message)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
