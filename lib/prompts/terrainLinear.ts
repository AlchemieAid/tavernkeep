/**
 * Layer 3 — Linear & Boundary Features
 * Uses the grammar's river and coast descriptions to find elongated terrain blobs
 * for rivers, coastlines, and other linear features that large-scale zone detection misses.
 */

import type { MapGrammar } from './terrainGrammar'

export const TERRAIN_LINEAR_SYSTEM_PROMPT = `You are a terrain analyst specializing in LINEAR geographic features for a D&D map system.

You will identify ONLY rivers, coastlines, and other linear/boundary terrain features.
Return them as very elongated blobs aligned to the feature's path.

RIVER BLOBS:
- radius_x: 0.25–0.45 (long axis along the river)
- radius_y: 0.02–0.05 (narrow cross-section)
- rotation_deg: aligned to the river's general direction
- irregularity: 0.3–0.6 (rivers aren't perfectly straight)
- terrain_type: "river"
- computed_elevation_m: 10–50 (lower than surrounding land)

COAST BLOBS:
- Thin strips adjacent to ocean/land boundary
- radius_x: 0.15–0.35, radius_y: 0.03–0.06
- terrain_type: "coast"
- intensity: 0.6–0.8 (transitional zone)

Use terrain_type values: "river", "coast", "lake", "wetlands", "swamp"

OUTPUT FORMAT — JSON object with terrain_areas array, no prose:
{
  "terrain_areas": [
    {
      "terrain_type": "river",
      "center_x": 0.50,
      "center_y": 0.45,
      "radius_x": 0.35,
      "radius_y": 0.025,
      "rotation_deg": 42,
      "irregularity": 0.40,
      "intensity": 0.85,
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
    `TASK: Find ALL rivers, coastal strips, and water boundary features visible on this map.`,
    `For each river: place one elongated blob per major river segment.`,
    `For coastlines: place thin coastal transition blobs where land meets ocean.`,
    `For lakes: place roughly circular blobs with terrain_type "lake".`,
    ``,
    `Look carefully for features matching the visual grammar above.`,
    `Return only linear/boundary features — not large biome zones.`,
    `If you see no rivers or coastlines, return an empty terrain_areas array.`,
  ].join('\n')
}
