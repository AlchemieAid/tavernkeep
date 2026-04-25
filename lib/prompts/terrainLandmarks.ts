/**
 * Layer 4 — Point Features & Landmarks
 * Uses the grammar's icon vocabulary to detect cities, volcanoes, ruins, and other
 * point features. Results create POIs in the database and may also generate small
 * terrain influence blobs (e.g., volcanic terrain around a volcano icon).
 */

import type { MapGrammar } from './terrainGrammar'

export interface DetectedLandmark {
  type: LandmarkType
  name: string | null
  x_pct: number
  y_pct: number
}

export type LandmarkType =
  | 'city'
  | 'town'
  | 'village'
  | 'port'
  | 'fortress'
  | 'castle'
  | 'ruin'
  | 'dungeon'
  | 'tower'
  | 'temple'
  | 'volcano'
  | 'oasis'
  | 'lighthouse'
  | 'mine'
  | 'other'

/**
 * Maps a detected landmark type to a POI category and type string
 * compatible with the points_of_interest table.
 */
export function landmarkToPoi(type: LandmarkType): { poi_category: string; poi_type: string } {
  const map: Record<LandmarkType, { poi_category: string; poi_type: string }> = {
    city:       { poi_category: 'settlement', poi_type: 'city' },
    town:       { poi_category: 'settlement', poi_type: 'town' },
    village:    { poi_category: 'settlement', poi_type: 'village' },
    port:       { poi_category: 'settlement', poi_type: 'port' },
    fortress:   { poi_category: 'military',   poi_type: 'fortress' },
    castle:     { poi_category: 'military',   poi_type: 'castle' },
    ruin:       { poi_category: 'ruin',       poi_type: 'ruin' },
    dungeon:    { poi_category: 'dungeon',    poi_type: 'dungeon' },
    tower:      { poi_category: 'landmark',   poi_type: 'tower' },
    temple:     { poi_category: 'landmark',   poi_type: 'temple' },
    volcano:    { poi_category: 'natural',    poi_type: 'volcano' },
    oasis:      { poi_category: 'natural',    poi_type: 'oasis' },
    lighthouse: { poi_category: 'landmark',   poi_type: 'lighthouse' },
    mine:       { poi_category: 'resource',   poi_type: 'mine' },
    other:      { poi_category: 'landmark',   poi_type: 'landmark' },
  }
  return map[type] ?? map.other
}

/**
 * For landmark types that also generate a small terrain blob, return the blob params.
 * Returns null if no terrain blob should be created.
 */
export function landmarkTerrainBlob(
  type: LandmarkType,
  x: number,
  y: number,
): { terrain_type: string; radius: number; intensity: number } | null {
  if (type === 'volcano') return { terrain_type: 'volcanic', radius: 0.06, intensity: 0.9 }
  if (type === 'oasis')   return { terrain_type: 'oasis',    radius: 0.04, intensity: 0.85 }
  if (type === 'mine')    return { terrain_type: 'highlands', radius: 0.04, intensity: 0.5 }
  return null
}

export const TERRAIN_LANDMARKS_SYSTEM_PROMPT = `You are a cartographic landmark detector for a D&D map system. You will identify every named or iconic POINT feature visible on the map — not areas, just specific locations marked by symbols, icons, or labels.

LANDMARK TYPES you can return:
city, town, village, port, fortress, castle, ruin, dungeon, tower, temple, volcano, oasis, lighthouse, mine, other

OUTPUT FORMAT — JSON object with detected_landmarks array, no prose:
{
  "detected_landmarks": [
    {
      "type": "city",
      "name": "Ironhaven",
      "x_pct": 0.42,
      "y_pct": 0.31
    },
    {
      "type": "volcano",
      "name": null,
      "x_pct": 0.68,
      "y_pct": 0.19
    }
  ]
}

Rules:
- x_pct, y_pct are normalized [0,1], (0,0) = top-left
- name: the label text near the icon if readable, otherwise null
- If you see NO point features, return an empty detected_landmarks array
- Do NOT include entire terrain regions — only discrete point symbols/icons`

export function buildTerrainLandmarksPrompt(grammar: MapGrammar): string {
  const cityDesc  = grammar.visual_grammar['cities'] ?? 'castle or building icon'
  const townDesc  = grammar.visual_grammar['towns']  ?? 'smaller building icon'
  const special   = grammar.visual_grammar['special']

  return [
    `MAP GRAMMAR — how point features appear on this specific map:`,
    `  Cities look like: ${cityDesc}`,
    `  Towns/villages look like: ${townDesc}`,
    special && special !== 'none' ? `  Special features: ${special}` : '',
    ``,
    `TASK: List every discrete point landmark, settlement icon, or named location symbol`,
    `visible on this map. Include their approximate normalized coordinates.`,
    `Look carefully for small icons that might be easy to miss.`,
    `If a feature has a readable label, include the name.`,
  ].filter(Boolean).join('\n')
}
