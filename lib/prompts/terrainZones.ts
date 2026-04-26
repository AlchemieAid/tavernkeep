/**
 * Layer 1+2 — Coarse Structure + Primary Biome Zones
 * Uses the map grammar from Layer 0 to identify 5–15 large terrain blobs.
 * Returns the same blob format as the existing terrain system.
 */

import type { MapGrammar } from './terrainGrammar'

export const TERRAIN_ZONES_SYSTEM_PROMPT = `You are a terrain analyst for a D&D map system. You will be given the visual grammar of the map first, then asked to identify terrain blobs.

Terrain blobs are elliptic influence zones described by blob parameters — NOT polygon vertices.
Blobs CAN and SHOULD overlap. A forested hillside is BOTH a forest blob AND a hills blob.

BLOB PARAMETERS:
- center_x, center_y: normalized [0,1], (0,0) = top-left
- radius_x, radius_y: semi-axes [0.04, 0.55]
- rotation_deg: 0–360
- irregularity: 0.0 = smooth ellipse, 0.9 = very jagged
- intensity: how strongly this terrain dominates at center [0.5, 1.0]

TERRAIN TYPES (exact strings only — DO NOT use water types):
plains, grassland, farmland,
forest, deep_forest, jungle,
hills, highlands, mountains, high_mountains,
swamp, wetlands, desert, badlands,
tundra, arctic, volcanic

NEVER generate: ocean, deep_sea, coast, river, lake — water is detected automatically from image pixels.

ELEVATION:
plains/grassland: 30–200m | hills: 200–800m
mountains: 800–3000m | high_mountains: 2000–4500m

OUTPUT FORMAT — JSON object with terrain_areas array, no prose:
{
  "terrain_areas": [
    {
      "terrain_type": "mountains",
      "center_x": 0.25,
      "center_y": 0.18,
      "radius_x": 0.22,
      "radius_y": 0.10,
      "rotation_deg": 35,
      "irregularity": 0.45,
      "intensity": 0.90,
      "elevation_min_m": 800,
      "elevation_max_m": 3200,
      "computed_elevation_m": 2000
    }
  ]
}`

export function buildTerrainZonesPrompt(
  grammar: MapGrammar,
  mapSize: 'region' | 'kingdom' | 'continent',
  biomeProfile?: string | null,
): string {
  const targetCount = mapSize === 'continent' ? '12–20' : mapSize === 'kingdom' ? '8–15' : '6–12'

  return [
    `MAP GRAMMAR (use this to interpret what you see):`,
    `Map type: ${grammar.map_type}`,
    `Scale: ${grammar.scale_notes}`,
    `Visual conventions:`,
    ...Object.entries(grammar.visual_grammar).map(([k, v]) => `  ${k}: ${v}`),
    ``,
    biomeProfile ? `Expected biome profile: ${biomeProfile}` : '',
    ``,
    `TASK: Identify ${targetCount} PRIMARY terrain blobs covering the major LAND environmental zones.`,
    `Focus on land areas only (mountain ranges, forest biomes, plains, desert, swamp, tundra).`,
    `DO NOT generate any water blobs (ocean, lake, river, coast, deep_sea) — water is detected from pixels.`,
    `DO NOT include individual settlements — those are handled separately.`,
    `Use the visual grammar above to correctly interpret what each land area looks like on this specific map.`,
    `Always include a base land layer blob (plains or grassland) covering the dominant land area.`,
  ].filter(Boolean).join('\n')
}
