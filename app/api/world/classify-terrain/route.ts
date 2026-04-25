import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClassifyTerrainSchema } from '@/lib/validators/world'
import OpenAI from 'openai'
import {
  TERRAIN_SYSTEM_PROMPT,
  buildTerrainClassificationUserPrompt,
} from '@/lib/prompts/terrainClassification'
import { TERRAIN_ELEVATION_RANGES, terrainMidpointElevation } from '@/lib/world/elevation'
import type { Json } from '@/lib/supabase/database.types'

/**
 * Generates a smooth 64-point polygon from elliptic blob parameters using
 * deterministic Fourier harmonic deformation. The same parameters always
 * produce the same polygon (no random seed). Higher irregularity = more
 * organic, coastline-like boundary.
 */
function generateTerrainPolygon(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg: number,
  irregularity: number,
  nPoints = 64,
): Array<{ x: number; y: number }> {
  const rot = (rotationDeg * Math.PI) / 180
  const cosR = Math.cos(rot)
  const sinR = Math.sin(rot)
  const irr = Math.max(0, Math.min(1, irregularity))

  return Array.from({ length: nPoints }, (_, i) => {
    const angle = (i / nPoints) * 2 * Math.PI
    // Deterministic organic deformation — Fourier harmonics with fixed phase offsets
    const deform =
      1 +
      irr * (
        0.28 * Math.sin(3 * angle + 1.23) +
        0.18 * Math.sin(5 * angle + 2.71) +
        0.13 * Math.sin(7 * angle + 0.93) +
        0.09 * Math.sin(11 * angle + 3.14) +
        0.06 * Math.sin(13 * angle + 1.73) +
        0.04 * Math.sin(17 * angle + 0.57)
      )
    const lx = rx * deform * Math.cos(angle)
    const ly = ry * deform * Math.sin(angle)
    return {
      x: Math.max(0, Math.min(1, cx + lx * cosR - ly * sinR)),
      y: Math.max(0, Math.min(1, cy + lx * sinR + ly * cosR)),
    }
  })
}

export const maxDuration = 60

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('[TERRAIN] classify-terrain called at', new Date().toISOString())

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[TERRAIN] Unauthorized request')
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[TERRAIN] Request body keys:', Object.keys(body), '| image_url length:', (body.image_url as string)?.length)

    const parsed = ClassifyTerrainSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[TERRAIN] Validation failed:', parsed.error.issues)
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { map_id, image_url } = parsed.data
    const isDataUrl = image_url.startsWith('data:')
    console.log('[TERRAIN] map_id:', map_id, '| image_url type:', isDataUrl ? 'data-url' : 'http-url', '| length:', image_url.length)

    const { data: map, error: mapError } = await supabase
      .from('campaign_maps')
      .select('id, dm_id, map_size, biome_profile, setup_stage')
      .eq('id', map_id)
      .eq('dm_id', user.id)
      .single()

    if (mapError || !map) {
      console.error('[TERRAIN] Map not found:', mapError?.message)
      return NextResponse.json(
        { data: null, error: { message: 'Map not found' } },
        { status: 404 }
      )
    }

    console.log('[TERRAIN] Map found:', { map_size: map.map_size, biome_profile: map.biome_profile, setup_stage: map.setup_stage })

    // Terrain classification requires vision (image analysis).
    // Always use OpenAI GPT-4o which has proven vision support for this structured task.
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[TERRAIN] OPENAI_API_KEY not configured')
      return NextResponse.json(
        { data: null, error: { message: 'AI vision service not configured (missing OPENAI_API_KEY)' } },
        { status: 503 }
      )
    }

    const openai = new OpenAI({ apiKey })
    console.log('[TERRAIN] Using OpenAI GPT-4o for vision-based terrain classification')

    const userPrompt = buildTerrainClassificationUserPrompt(
      (map.map_size as 'region' | 'kingdom' | 'continent') ?? 'region',
      map.biome_profile ?? undefined
    )
    console.log('[TERRAIN] User prompt length:', userPrompt.length)

    // OpenAI accepts both HTTP URLs and data URLs (base64 inline) for vision
    // Gemini images arrive as data: URIs, which OpenAI handles natively
    console.log('[TERRAIN] Sending image to GPT-4o vision:', isDataUrl ? `data URI (${image_url.length} chars)` : image_url)

    const aiStart = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TERRAIN_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: image_url, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4096,
    })
    const aiDuration = Date.now() - aiStart
    const choice = completion.choices[0]
    console.log('[TERRAIN] AI response took', aiDuration, 'ms | tokens used:', completion.usage?.total_tokens, '| finish_reason:', choice.finish_reason)

    if (!choice.message.content) {
      const reason = choice.finish_reason
      const isFilter = reason === 'content_filter'
      console.error('[TERRAIN] AI returned null content. finish_reason:', reason)
      return NextResponse.json(
        {
          data: null,
          error: {
            message: isFilter
              ? 'The AI declined to analyze this image due to content policy. Try regenerating the map with different settings.'
              : `AI returned no content (finish_reason: ${reason}). Try again.`,
          },
        },
        { status: 502 }
      )
    }

    const rawContent = choice.message.content
    console.log('[TERRAIN] Raw AI response length:', rawContent.length, '| preview:', rawContent.slice(0, 200))

    let terrainBlobs: unknown[]
    try {
      const parsed = JSON.parse(rawContent)
      terrainBlobs = Array.isArray(parsed) ? parsed : (parsed.terrain_areas ?? parsed.areas ?? parsed.zones ?? [])
      if (!Array.isArray(terrainBlobs)) throw new Error('No array found in response')
      console.log('[TERRAIN] Parsed', terrainBlobs.length, 'terrain blobs')
    } catch (parseErr) {
      console.error('[TERRAIN] Failed to parse AI response:', parseErr, '| raw:', rawContent.slice(0, 500))
      return NextResponse.json(
        { data: null, error: { message: 'AI returned invalid terrain data — please try again' } },
        { status: 502 }
      )
    }

    const insertRows = (terrainBlobs as Array<{
      terrain_type: string
      // Blob shape parameters (new format)
      center_x?: number
      center_y?: number
      radius_x?: number
      radius_y?: number
      rotation_deg?: number
      irregularity?: number
      intensity?: number
      // Elevation
      elevation_min_m?: number
      elevation_max_m?: number
      computed_elevation_m?: number
      // Legacy polygon passthrough (old format, ignored in favour of blob params)
      polygon?: object
    }>).map(area => {
      const range = TERRAIN_ELEVATION_RANGES[area.terrain_type]

      // Generate smooth 64-point polygon from blob parameters.
      // Fall back to a unit circle centred at (0.5,0.5) if the AI omits params.
      const cx = area.center_x ?? 0.5
      const cy = area.center_y ?? 0.5
      const rx = Math.max(0.04, Math.min(0.55, area.radius_x ?? 0.25))
      const ry = Math.max(0.04, Math.min(0.55, area.radius_y ?? 0.15))
      const rot = area.rotation_deg ?? 0
      const irr = area.irregularity ?? 0.3
      const polygon = generateTerrainPolygon(cx, cy, rx, ry, rot, irr)

      console.log(
        `[TERRAIN] ${area.terrain_type}: center=(${cx.toFixed(2)},${cy.toFixed(2)}) r=(${rx.toFixed(2)},${ry.toFixed(2)}) rot=${rot}° irr=${irr.toFixed(2)} intensity=${(area.intensity ?? 1).toFixed(2)}`
      )

      return {
        map_id,
        terrain_type: area.terrain_type,
        polygon: polygon as unknown as Json,
        intensity: Math.max(0.1, Math.min(1.0, area.intensity ?? 1.0)),
        elevation_min_m: area.elevation_min_m ?? range?.min ?? 0,
        elevation_max_m: area.elevation_max_m ?? range?.max ?? 0,
        computed_elevation_m: area.computed_elevation_m ?? terrainMidpointElevation(area.terrain_type),
        placed_by: 'ai' as const,
      }
    })

    console.log('[TERRAIN] Deleting existing AI terrain areas for map:', map_id)
    await supabase.from('terrain_areas').delete().eq('map_id', map_id).eq('placed_by', 'ai')

    console.log('[TERRAIN] Inserting', insertRows.length, 'terrain rows')
    const { data: inserted, error: insertError } = await supabase
      .from('terrain_areas')
      .insert(insertRows)
      .select()

    if (insertError) {
      console.error('[TERRAIN] DB insert failed:', insertError)
      return NextResponse.json(
        { data: null, error: { message: `Failed to save terrain: ${insertError.message}` } },
        { status: 500 }
      )
    }

    await supabase
      .from('campaign_maps')
      .update({ setup_stage: 'terrain_classified' })
      .eq('id', map_id)

    const totalDuration = Date.now() - startTime
    console.log('[TERRAIN] Complete. Inserted', inserted?.length, 'terrain areas in', totalDuration, 'ms')

    return NextResponse.json({ data: inserted, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[TERRAIN] Unhandled error after', Date.now() - startTime, 'ms:', message, err)
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
