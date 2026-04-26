import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { detectTerrainFromSeeds } from '@/lib/world/terrainSeeds'

export const maxDuration = 60

const TerrainSeedSchema = z.object({
  terrain_type: z.string().min(1).max(60),
  x_pct: z.number().min(0).max(1),
  y_pct: z.number().min(0).max(1),
  gap_bridge: z.enum(['tight', 'medium', 'wide']),
})

const RequestSchema = z.object({
  map_id: z.string().uuid(),
  image_url: z.string().refine(
    (v) => v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:'),
    { message: 'image_url must be an HTTP URL or data URI' }
  ),
  seeds: z.array(TerrainSeedSchema).min(1).max(50),
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
  const { map_id, image_url, seeds } = parsed.data

  const { data: map, error: mapError } = await supabase
    .from('campaign_maps')
    .select('id, dm_id')
    .eq('id', map_id)
    .eq('dm_id', user.id)
    .single()

  if (mapError || !map) {
    return NextResponse.json({ data: null, error: { message: 'Map not found' } }, { status: 404 })
  }

  try {
    const regions = await detectTerrainFromSeeds(image_url, seeds)
    return NextResponse.json({ data: regions, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Detection failed'
    console.error('[TERRAIN-SEEDS]', message)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
