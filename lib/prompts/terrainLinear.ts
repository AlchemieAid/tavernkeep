/**
 * Layer 3 — Linear & Boundary Features
 * Uses the grammar's river and coast descriptions to find elongated terrain blobs
 * for rivers, coastlines, and other linear features that large-scale zone detection misses.
 */

import type { MapGrammar } from './terrainGrammar'

export const TERRAIN_LINEAR_SYSTEM_PROMPT = `You are a terrain analyst specializing in LINEAR geographic features for a D&D map system.

You will identify ONLY rivers, coastlines, and other linear/boundary terrain features.
Rivers are NOT a single blob — they meander. Represent each river as a CHAIN of small
overlapping blobs, one per straight section or bend.

RIVER BLOBS (per segment — use 3–8 blobs per river):
- radius_x: 0.06–0.18 (short — covers one straight section or bend, NOT the whole river)
- radius_y: 0.015–0.035 (narrow cross-section)
- rotation_deg: aligned to THIS segment's direction
- irregularity: 0.3–0.5
- terrain_type: "river"
- Place blobs end-to-end along the river's actual path, overlapping slightly
- computed_elevation_m: 10–50 (lower than surrounding land)

COAST BLOBS:
- Thin strips tracing the land/ocean boundary
- radius_x: 0.10–0.25, radius_y: 0.03–0.05
- rotation_deg: aligned to the coastline segment
- terrain_type: "coast"
- intensity: 0.6–0.8 (transitional zone)
- Use multiple blobs for curved or long coastlines

Use terrain_type values: "river", "coast", "lake", "wetlands", "swamp"

OUTPUT FORMAT — JSON object with terrain_areas array, no prose:
{
  "terrain_areas": [
    {
      "terrain_type": "river",
      "center_x": 0.32,
      "center_y": 0.28,
      "radius_x": 0.10,
      "radius_y": 0.022,
      "rotation_deg": 55,
      "irregularity": 0.35,
      "intensity": 0.90,
      "elevation_min_m": 10,
      "elevation_max_m": 50,
      "computed_elevation_m": 25
    },
    {
      "terrain_type": "river",
      "center_x": 0.42,
      "center_y": 0.38,
      "radius_x": 0.10,
      "radius_y": 0.022,
      "rotation_deg": 80,
      "irregularity": 0.35,
      "intensity": 0.90,
      "elevation_min_m": 10,
      "elevation_max_m": 50,
      "computed_elevation_m": 25
    }
  ]
}`

export function buildTerrainLinearPrompt(grammar: MapGrammar): string {
  const riverDesc = grammar.visual_grammar['rivers'] ?? 'thin lines'
  const coastDesc = grammar.visual_grammar['coast'] ?? grammar.visual_grammar['ocean'] ?? 'water edge'
  const lakeDesc = grammar.visual_grammar['lakes'] ?? 'enclosed water body'

  return [
    `MAP GRAMMAR — how linear features appear on this specific map:`,
    `  Rivers look like: ${riverDesc}`,
    `  Coastlines look like: ${coastDesc}`,
    `  Lakes look like: ${lakeDesc}`,
    ``,
    `TASK: Trace ALL rivers, coastal strips, and water boundary features visible on this map.`,
    `For each river: output 3–8 SMALL overlapping blobs end-to-end, one per straight section`,
    `  or bend — following the river's actual path across the map. Each segment blob should`,
    `  have radius_x 0.06–0.18 (NOT 0.35+). Chain them so they overlap slightly.`,
    `For coastlines: place thin strips (radius_y 0.03–0.05) tracing the land/ocean edge.`,
    `For lakes: place roughly circular blobs with terrain_type "lake".`,
    ``,
    `Look carefully at the full-resolution image for features matching the visual grammar above.`,
    `Return only linear/boundary features — not large biome zones.`,
    `If you see no rivers or coastlines, return an empty terrain_areas array.`,
  ].join('\n')
}
