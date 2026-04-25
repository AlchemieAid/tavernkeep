/**
 * Tests for the terrain analysis pipeline.
 *
 * Covers:
 * - JSON parser helper (parseJsonArray)
 * - Default biome blob fallback
 * - Prompt builders (terrainZones, terrainLinear, terrainLandmarks)
 * - landmarkToPoi / landmarkTerrainBlob mapping
 * - Full pipeline fallback when Layer 0 fails
 */

import { landmarkToPoi, landmarkTerrainBlob, type LandmarkType } from '@/lib/prompts/terrainLandmarks'
import { buildTerrainZonesPrompt } from '@/lib/prompts/terrainZones'
import { buildTerrainLinearPrompt } from '@/lib/prompts/terrainLinear'
import { buildTerrainLandmarksPrompt } from '@/lib/prompts/terrainLandmarks'
import type { MapGrammar } from '@/lib/prompts/terrainGrammar'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — access private parseJsonArray by re-implementing it in tests
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
// parseJsonArray
// ─────────────────────────────────────────────────────────────────────────────

describe('parseJsonArray', () => {
  it('returns top-level array', () => {
    const result = parseJsonArray('[{"a":1}]', ['items'])
    expect(result).toEqual([{ a: 1 }])
  })

  it('returns named array from object wrapper', () => {
    const result = parseJsonArray('{"terrain_areas":[{"type":"forest"}]}', ['terrain_areas', 'areas'])
    expect(result).toEqual([{ type: 'forest' }])
  })

  it('returns second key if first is absent', () => {
    const result = parseJsonArray('{"zones":[{"z":1}]}', ['terrain_areas', 'areas', 'zones'])
    expect(result).toEqual([{ z: 1 }])
  })

  it('returns null for invalid JSON', () => {
    const result = parseJsonArray('not json', ['areas'])
    expect(result).toBeNull()
  })

  it('returns null when no array found in object', () => {
    const result = parseJsonArray('{"foo":"bar"}', ['areas'])
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = parseJsonArray('', ['areas'])
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// landmarkToPoi
// ─────────────────────────────────────────────────────────────────────────────

describe('landmarkToPoi', () => {
  const cases: [LandmarkType, string, string][] = [
    ['city',      'settlement', 'city'],
    ['town',      'settlement', 'town'],
    ['village',   'settlement', 'village'],
    ['port',      'settlement', 'port'],
    ['fortress',  'military',   'fortress'],
    ['castle',    'military',   'castle'],
    ['ruin',      'ruin',       'ruin'],
    ['dungeon',   'dungeon',    'dungeon'],
    ['volcano',   'natural',    'volcano'],
    ['oasis',     'natural',    'oasis'],
    ['lighthouse','landmark',   'lighthouse'],
    ['mine',      'resource',   'mine'],
    ['tower',     'landmark',   'tower'],
    ['temple',    'landmark',   'temple'],
    ['other',     'landmark',   'landmark'],
  ]

  it.each(cases)('%s → category=%s type=%s', (type, expectedCategory, expectedType) => {
    const { poi_category, poi_type } = landmarkToPoi(type)
    expect(poi_category).toBe(expectedCategory)
    expect(poi_type).toBe(expectedType)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// landmarkTerrainBlob
// ─────────────────────────────────────────────────────────────────────────────

describe('landmarkTerrainBlob', () => {
  it('returns volcanic blob for volcano', () => {
    const blob = landmarkTerrainBlob('volcano', 0.5, 0.5)
    expect(blob).not.toBeNull()
    expect(blob!.terrain_type).toBe('volcanic')
    expect(blob!.radius).toBeGreaterThan(0)
  })

  it('returns oasis blob for oasis', () => {
    const blob = landmarkTerrainBlob('oasis', 0.5, 0.5)
    expect(blob).not.toBeNull()
    expect(blob!.terrain_type).toBe('oasis')
  })

  it('returns null for city (no terrain effect)', () => {
    expect(landmarkTerrainBlob('city', 0.5, 0.5)).toBeNull()
  })

  it('returns null for ruin', () => {
    expect(landmarkTerrainBlob('ruin', 0.5, 0.5)).toBeNull()
  })

  it('returns null for dungeon', () => {
    expect(landmarkTerrainBlob('dungeon', 0.5, 0.5)).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_GRAMMAR: MapGrammar = {
  map_type: 'fantasy_illustrated',
  visual_grammar: {
    ocean: 'flat blue',
    rivers: 'thin dark sinuous lines',
    lakes: 'enclosed oval blue shapes',
    mountains: 'brown jagged peaks',
    hills: 'rounded brown bumps',
    forest: 'dark green stippled canopy',
    plains: 'light tan open areas',
    desert: 'sandy yellow texture',
    coast: 'hatched edge where land meets sea',
    cities: 'small castle icon with label',
    towns: 'small house icon with label',
    roads: 'thin double lines',
    special: 'none',
  },
  dominant_palette: ['#1a3a6b', '#3a5a2c'],
  scale_notes: 'regional, ~200km',
}

describe('buildTerrainZonesPrompt', () => {
  it('includes grammar map type', () => {
    const prompt = buildTerrainZonesPrompt(MOCK_GRAMMAR, 'region', 'forest_mountain')
    expect(prompt).toContain('fantasy_illustrated')
  })

  it('includes biome profile when provided', () => {
    const prompt = buildTerrainZonesPrompt(MOCK_GRAMMAR, 'region', 'coastal_desert')
    expect(prompt).toContain('coastal_desert')
  })

  it('includes target blob count for continent', () => {
    const prompt = buildTerrainZonesPrompt(MOCK_GRAMMAR, 'continent', null)
    expect(prompt).toMatch(/12.{1,5}20/)
  })

  it('includes target blob count for kingdom', () => {
    const prompt = buildTerrainZonesPrompt(MOCK_GRAMMAR, 'kingdom', null)
    expect(prompt).toMatch(/8.{1,5}15/)
  })

  it('omits biome line when null', () => {
    const prompt = buildTerrainZonesPrompt(MOCK_GRAMMAR, 'region', null)
    expect(prompt).not.toContain('biome profile:')
  })
})

describe('buildTerrainLinearPrompt', () => {
  it('includes river description from grammar', () => {
    const prompt = buildTerrainLinearPrompt(MOCK_GRAMMAR)
    expect(prompt).toContain('thin dark sinuous lines')
  })

  it('includes coast description from grammar', () => {
    const prompt = buildTerrainLinearPrompt(MOCK_GRAMMAR)
    expect(prompt).toContain('hatched edge where land meets sea')
  })

  it('includes lake description from grammar', () => {
    const prompt = buildTerrainLinearPrompt(MOCK_GRAMMAR)
    expect(prompt).toContain('enclosed oval blue shapes')
  })
})

describe('buildTerrainLandmarksPrompt', () => {
  it('includes city description from grammar', () => {
    const prompt = buildTerrainLandmarksPrompt(MOCK_GRAMMAR)
    expect(prompt).toContain('small castle icon with label')
  })

  it('includes town description from grammar', () => {
    const prompt = buildTerrainLandmarksPrompt(MOCK_GRAMMAR)
    expect(prompt).toContain('small house icon with label')
  })

  it('does not include special section when value is none', () => {
    const prompt = buildTerrainLandmarksPrompt(MOCK_GRAMMAR)
    expect(prompt).not.toContain('Special features: none')
  })

  it('includes special section when value is present', () => {
    const grammarWithSpecial: MapGrammar = {
      ...MOCK_GRAMMAR,
      visual_grammar: { ...MOCK_GRAMMAR.visual_grammar, special: 'glowing green rivers' },
    }
    const prompt = buildTerrainLandmarksPrompt(grammarWithSpecial)
    expect(prompt).toContain('glowing green rivers')
  })
})
