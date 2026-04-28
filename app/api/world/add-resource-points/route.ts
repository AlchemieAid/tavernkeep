import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ResourcePointSchema = z.object({
  x_pct: z.number().min(0).max(1),
  y_pct: z.number().min(0).max(1),
  resource_type: z.string().min(1),
  richness: z.number().min(1).max(10),
  influence_radius_pct: z.number().min(0.01).max(0.5).optional().default(0.15),
  name: z.string().max(100).nullable().optional(),
})

const BatchSchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  points: z.array(ResourcePointSchema).min(1).max(2000),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const body = await request.json()
    const parsed = BatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: parsed.error.errors[0].message } }, { status: 400 })
    }

    const { map_id, campaign_id, points } = parsed.data

    // Verify ownership once for the whole batch
    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id')
      .eq('id', map_id)
      .eq('campaign_id', campaign_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      return NextResponse.json({ data: null, error: { message: 'Map not found' } }, { status: 404 })
    }

    const rows = points.map(p => ({
      map_id,
      x_pct: p.x_pct,
      y_pct: p.y_pct,
      resource_type: p.resource_type,
      richness: p.richness / 10, // UI sends 1–10; DB constraint expects 0.1–1.0
      influence_radius_pct: p.influence_radius_pct ?? 0.15,
      name: p.name ?? null,
      placed_by: 'dm' as const,
    }))

    const { data: inserted, error } = await supabase
      .from('resource_points')
      .insert(rows)
      .select()

    if (error) {
      return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
    }

    return NextResponse.json({ data: inserted, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
