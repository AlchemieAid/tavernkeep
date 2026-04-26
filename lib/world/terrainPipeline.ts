/**
 * Terrain Analysis Pipeline — Hierarchical 4-layer terrain classification.
 *
 * Yields SSE-compatible progress events as an async generator so the route
 * can stream them to the client in real time. Each layer commits its results
 * to the database before yielding its completion event, ensuring partial
 * results are always saved even if later layers fail.
 *
 * Layer 0: Map grammar extraction (gpt-4o) — learns the visual language
 * Layer 1+2: Primary biome zones (gpt-4o-mini) — large area blobs
 * Layer 3: Linear features (gpt-4o-mini) — rivers, coast strips
 * Layer 4: Point landmarks (gpt-4o-mini) — cities, volcanoes, ruins → POIs
 *
 * Fallback chain:
 *   L0 fail → use legacy single-prompt system
 *   L1+2 fail → use biome_profile defaults
 *   L3 fail → skip, mark skipped in grammar
 *   L4 fail → skip, mark skipped in grammar
 */

import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { Json } from '@/lib/supabase/database.types'
import {
  TERRAIN_GRAMMAR_SYSTEM_PROMPT,
  buildTerrainGrammarPrompt,
  type MapGrammar,
  type CampaignContext,
} from '@/lib/prompts/terrainGrammar'
import {
  TERRAIN_ZONES_SYSTEM_PROMPT,
  buildTerrainZonesPrompt,
} from '@/lib/prompts/terrainZones'
import {
  TERRAIN_LINEAR_SYSTEM_PROMPT,
  buildTerrainLinearPrompt,
} from '@/lib/prompts/terrainLinear'
import {
  TERRAIN_LANDMARKS_SYSTEM_PROMPT,
  buildTerrainLandmarksPrompt,
  landmarkToPoi,
  landmarkTerrainBlob,
  type DetectedLandmark,
} from '@/lib/prompts/terrainLandmarks'
import { TERRAIN_ELEVATION_RANGES, terrainMidpointElevation } from '@/lib/world/elevation'
import {
  TERRAIN_SYSTEM_PROMPT,
  buildTerrainClassificationUserPrompt,
} from '@/lib/prompts/terrainClassification'

// ─────────────────────────────────────────────────────────────────────────────
// SSE event types
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineEvent =
  | { type: 'progress';      layer: number; message: string }
  | { type: 'layer_success'; layer: number; message: string }
  | { type: 'layer_failed';  layer: number; message: string }
  | { type: 'complete'; terrain_count: number; poi_count: number; skipped: string[] }
  | { type: 'error'; message: string }

// ─────────────────────────────────────────────────────────────────────────────
// Polygon generator (same as in classify-terrain/route.ts)
// ─────────────────────────────────────────────────────────────────────────────

function generateTerrainPolygon(
  cx: number, cy: number, rx: number, ry: number,
  rotationDeg: number, irregularity: number, nPoints = 64,
): Array<{ x: number; y: number }> {
  const rot = (rotationDeg * Math.PI) / 180
  const cosR = Math.cos(rot)
  const sinR = Math.sin(rot)
  const irr = Math.max(0, Math.min(1, irregularity))
  return Array.from({ length: nPoints }, (_, i) => {
    const angle = (i / nPoints) * 2 * Math.PI
    const deform = 1 + irr * (
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

type BlobInput = {
  terrain_type: string
  center_x?: number; center_y?: number
  radius_x?: number; radius_y?: number
  rotation_deg?: number; irregularity?: number; intensity?: number
  elevation_min_m?: number; elevation_max_m?: number; computed_elevation_m?: number
}

function blobToInsertRow(blob: BlobInput, mapId: string) {
  const range = TERRAIN_ELEVATION_RANGES[blob.terrain_type]
  const cx = blob.center_x ?? 0.5
  const cy = blob.center_y ?? 0.5
  const rx = Math.max(0.04, Math.min(0.55, blob.radius_x ?? 0.25))
  const ry = Math.max(0.04, Math.min(0.55, blob.radius_y ?? 0.15))
  const polygon = generateTerrainPolygon(cx, cy, rx, ry, blob.rotation_deg ?? 0, blob.irregularity ?? 0.3)
  return {
    map_id: mapId,
    terrain_type: blob.terrain_type,
    polygon: polygon as unknown as Json,
    intensity: Math.max(0.1, Math.min(1.0, blob.intensity ?? 1.0)),
    elevation_min_m: blob.elevation_min_m ?? range?.min ?? 0,
    elevation_max_m: blob.elevation_max_m ?? range?.max ?? 0,
    computed_elevation_m: blob.computed_elevation_m ?? terrainMidpointElevation(blob.terrain_type),
    placed_by: 'ai' as const,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe JSON parse helper
// ─────────────────────────────────────────────────────────────────────────────

function parseJsonArray(raw: string, keys: string[]): unknown[] | null {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    for (const k of keys) {
      if (Array.isArray(parsed[k])) return parsed[k]
    }
    return null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default biome blobs for Layer 1+2 fallback
// ─────────────────────────────────────────────────────────────────────────────

function defaultBiomeBlobs(biomeProfile: string | null): BlobInput[] {
  const base: BlobInput[] = [
    { terrain_type: 'plains', center_x: 0.5, center_y: 0.5, radius_x: 0.5, radius_y: 0.5, irregularity: 0.2, intensity: 0.6 },
  ]
  if (!biomeProfile) return base
  const bp = biomeProfile.toLowerCase()
  if (bp.includes('mountain') || bp.includes('alpine'))
    base.push({ terrain_type: 'mountains', center_x: 0.3, center_y: 0.25, radius_x: 0.25, radius_y: 0.12, rotation_deg: 30, irregularity: 0.4, intensity: 0.85 })
  if (bp.includes('forest') || bp.includes('jungle'))
    base.push({ terrain_type: 'forest', center_x: 0.65, center_y: 0.55, radius_x: 0.22, radius_y: 0.18, irregularity: 0.5, intensity: 0.8 })
  if (bp.includes('coast') || bp.includes('island') || bp.includes('ocean'))
    base.push({ terrain_type: 'ocean', center_x: 0.1, center_y: 0.5, radius_x: 0.15, radius_y: 0.5, irregularity: 0.4, intensity: 0.95 })
  if (bp.includes('desert') || bp.includes('arid'))
    base.push({ terrain_type: 'desert', center_x: 0.7, center_y: 0.7, radius_x: 0.25, radius_y: 0.2, irregularity: 0.2, intensity: 0.85 })
  return base
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineInput {
  mapId: string
  imageUrl: string
  mapSize: 'region' | 'kingdom' | 'continent'
  biomeProfile: string | null
  campaignId: string
  dmId: string
  campaignContext?: CampaignContext | null
  openai: OpenAI
  supabase: SupabaseClient<Database>
}

export async function* runTerrainPipeline(input: PipelineInput): AsyncGenerator<PipelineEvent> {
  const { mapId, imageUrl, mapSize, biomeProfile, campaignId, dmId, campaignContext, openai, supabase } = input
  const skipped: string[] = []
  let terrainCount = 0
  let poiCount = 0

  // Delete previous AI terrain areas before starting
  await supabase.from('terrain_areas').delete().eq('map_id', mapId).eq('placed_by', 'ai')

  // ── Layer 0: Map Grammar Extraction ──────────────────────────────────────
  yield { type: 'progress', layer: 0, message: 'Reading map style and visual language…' }

  let grammar: MapGrammar | null = null
  try {
    const l0 = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: 'system', content: TERRAIN_GRAMMAR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildTerrainGrammarPrompt(campaignContext) },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
    })
    const raw = l0.choices[0]?.message?.content ?? ''
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed.map_type === 'string' && parsed.visual_grammar) {
      grammar = parsed as MapGrammar
      await supabase
        .from('campaign_maps')
        .update({ map_grammar: grammar as unknown as Json })
        .eq('id', mapId)
      yield { type: 'layer_success', layer: 0, message: `${grammar.map_type} map — grammar extracted` }
    } else {
      throw new Error('Grammar parse failed')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[PIPELINE] Layer 0 failed, falling back to legacy system:', msg)
    yield { type: 'layer_failed', layer: 0, message: 'Style detection unavailable — using standard analysis' }

    // ── Fallback: run legacy single-prompt system ──────────────────────────
    try {
      yield { type: 'progress', layer: 1, message: 'Running standard terrain classification…' }
      const userPrompt = buildTerrainClassificationUserPrompt(mapSize, biomeProfile ?? undefined)
      const fallback = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: TERRAIN_SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ]},
        ],
      })
      const fbRaw = fallback.choices[0]?.message?.content ?? ''
      const fbBlobs = parseJsonArray(fbRaw, ['terrain_areas', 'areas', 'zones'])
      if (fbBlobs && fbBlobs.length > 0) {
        const rows = (fbBlobs as BlobInput[]).map(b => blobToInsertRow(b, mapId))
        const { data } = await supabase.from('terrain_areas').insert(rows).select()
        terrainCount = data?.length ?? 0
        await supabase.from('campaign_maps').update({ setup_stage: 'terrain_classified' }).eq('id', mapId)
        yield { type: 'layer_success', layer: 1, message: `${terrainCount} terrain areas classified (standard mode)` }
        yield { type: 'complete', terrain_count: terrainCount, poi_count: 0, skipped: ['grammar', 'linear', 'landmarks'] }
        return
      }
    } catch (fbErr) {
      console.error('[PIPELINE] Legacy fallback also failed:', fbErr)
    }
    yield { type: 'error', message: 'Terrain classification failed — please try again' }
    return
  }

  // ── Layer 1+2: Primary Biome Zones ───────────────────────────────────────
  yield { type: 'progress', layer: 1, message: 'Identifying major terrain zones…' }
  try {
    const l12 = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: TERRAIN_ZONES_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildTerrainZonesPrompt(grammar, mapSize, biomeProfile) },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
    })
    const raw = l12.choices[0]?.message?.content ?? ''
    const blobs = parseJsonArray(raw, ['terrain_areas', 'areas', 'zones'])
    if (!blobs || blobs.length === 0) throw new Error('No blobs returned')
    const rows = (blobs as BlobInput[]).map(b => blobToInsertRow(b, mapId))
    const { data } = await supabase.from('terrain_areas').insert(rows).select()
    terrainCount += data?.length ?? 0
    yield { type: 'layer_success', layer: 1, message: `${data?.length ?? 0} terrain zones identified` }
  } catch (err) {
    console.warn('[PIPELINE] Layer 1+2 failed, using biome defaults:', err)
    skipped.push('zones')
    const defaults = defaultBiomeBlobs(biomeProfile)
    const rows = defaults.map(b => blobToInsertRow(b, mapId))
    await supabase.from('terrain_areas').insert(rows)
    terrainCount += rows.length
    yield { type: 'layer_failed', layer: 1, message: 'Zone detection used defaults — terrain may be approximate' }
  }

  // ── Layer 3: Linear Features ──────────────────────────────────────────────
  yield { type: 'progress', layer: 2, message: 'Tracing rivers and coastlines…' }
  try {
    const l3 = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2500,
      messages: [
        { role: 'system', content: TERRAIN_LINEAR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildTerrainLinearPrompt(grammar) },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
    })
    const raw = l3.choices[0]?.message?.content ?? ''
    const blobs = parseJsonArray(raw, ['terrain_areas', 'areas', 'linear_features'])
    if (blobs && blobs.length > 0) {
      const rows = (blobs as BlobInput[]).map(b => blobToInsertRow(b, mapId))
      const { data } = await supabase.from('terrain_areas').insert(rows).select()
      terrainCount += data?.length ?? 0
      yield { type: 'layer_success', layer: 2, message: `${data?.length ?? 0} rivers and coastal features traced` }
    } else {
      yield { type: 'layer_success', layer: 2, message: 'No rivers or coastlines detected' }
    }
  } catch (err) {
    console.warn('[PIPELINE] Layer 3 failed:', err)
    skipped.push('linear')
    if (grammar.layers_skipped) grammar.layers_skipped.push('linear')
    else grammar.layers_skipped = ['linear']
    await supabase.from('campaign_maps').update({ map_grammar: grammar as unknown as Json }).eq('id', mapId)
    yield { type: 'layer_failed', layer: 2, message: 'River detection skipped — add rivers manually if needed' }
  }

  // ── Layer 4: Point Landmarks → POIs ──────────────────────────────────────
  yield { type: 'progress', layer: 3, message: 'Spotting landmarks and settlements…' }
  try {
    const l4 = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: TERRAIN_LANDMARKS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildTerrainLandmarksPrompt(grammar) },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
    })
    const raw = l4.choices[0]?.message?.content ?? ''
    const landmarks = parseJsonArray(raw, ['detected_landmarks', 'landmarks', 'points'])

    if (landmarks && landmarks.length > 0) {
      const poiRows: Array<{
        map_id: string; campaign_id: string; dm_id: string
        x_pct: number; y_pct: number
        poi_category: string; poi_type: string
        name: string | null
        is_discovered: boolean; is_visible_to_players: boolean
      }> = []
      const terrainBlobRows: BlobInput[] = []

      for (const lm of landmarks as DetectedLandmark[]) {
        if (!lm.type || lm.x_pct == null || lm.y_pct == null) continue
        const { poi_category, poi_type } = landmarkToPoi(lm.type)
        poiRows.push({
          map_id: mapId,
          campaign_id: campaignId,
          dm_id: dmId,
          x_pct: Math.max(0, Math.min(1, lm.x_pct)),
          y_pct: Math.max(0, Math.min(1, lm.y_pct)),
          poi_category,
          poi_type,
          name: lm.name ?? null,
          is_discovered: false,
          is_visible_to_players: false,
        })

        const tb = landmarkTerrainBlob(lm.type, lm.x_pct, lm.y_pct)
        if (tb) {
          terrainBlobRows.push({
            terrain_type: tb.terrain_type,
            center_x: lm.x_pct,
            center_y: lm.y_pct,
            radius_x: tb.radius,
            radius_y: tb.radius,
            irregularity: 0.3,
            intensity: tb.intensity,
          })
        }
      }

      if (poiRows.length > 0) {
        const { data } = await supabase.from('points_of_interest').insert(poiRows).select()
        poiCount = data?.length ?? 0
      }
      if (terrainBlobRows.length > 0) {
        const rows = terrainBlobRows.map(b => blobToInsertRow(b, mapId))
        await supabase.from('terrain_areas').insert(rows)
        terrainCount += rows.length
      }

      const settlementCount = (landmarks as DetectedLandmark[]).filter(
        l => ['city', 'town', 'village', 'port'].includes(l.type)
      ).length
      const otherCount = poiCount - settlementCount
      const parts = []
      if (settlementCount > 0) parts.push(`${settlementCount} settlement${settlementCount > 1 ? 's' : ''}`)
      if (otherCount > 0) parts.push(`${otherCount} landmark${otherCount > 1 ? 's' : ''}`)
      yield { type: 'layer_success', layer: 3, message: `${parts.join(', ')} detected and added to map` }
    } else {
      yield { type: 'layer_success', layer: 3, message: 'No landmarks detected' }
    }
  } catch (err) {
    console.warn('[PIPELINE] Layer 4 failed:', err)
    skipped.push('landmarks')
    if (grammar.layers_skipped) grammar.layers_skipped.push('landmarks')
    else grammar.layers_skipped = ['landmarks']
    await supabase.from('campaign_maps').update({ map_grammar: grammar as unknown as Json }).eq('id', mapId)
    yield { type: 'layer_failed', layer: 3, message: 'Landmark detection skipped — place POIs manually' }
  }

  // ── Commit setup stage ────────────────────────────────────────────────────
  await supabase
    .from('campaign_maps')
    .update({ setup_stage: 'terrain_classified' })
    .eq('id', mapId)

  yield { type: 'complete', terrain_count: terrainCount, poi_count: poiCount, skipped }
}
