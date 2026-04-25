export interface ResourcePlacementInput {
  map_size: 'region' | 'kingdom' | 'continent'
  terrain_summary: string
  terrain_blob_count?: number
}

/**
 * Per-blob multipliers: how many resource points to target per classified terrain area.
 * Larger map scales need more points per blob to adequately cover the area.
 */
const PER_BLOB: Record<string, { min: number; max: number }> = {
  region:    { min: 1.5, max: 2.5 },
  kingdom:   { min: 2.5, max: 4.0 },
  continent: { min: 3.5, max: 5.5 },
}

/** Absolute floor/ceiling so degenerate terrain counts stay sane */
const ABSOLUTE: Record<string, { min: number; max: number }> = {
  region:    { min: 10, max: 35  },
  kingdom:   { min: 20, max: 65  },
  continent: { min: 40, max: 110 },
}

export const RESOURCE_PLACEMENT_SYSTEM_PROMPT = `You are a world-building assistant placing resource points on a fantasy map for a D&D campaign management system.

COORDINATE SYSTEM: All x/y values are normalized floats [0.0, 1.0]. (0,0) = top-left.

RESOURCE TYPES (use exact strings only):
EXTRACTION: iron_deposit, copper_deposit, gold_vein, silver_vein, gem_cluster, coal_seam, stone_quarry, salt_flat, sulfur_vent
BIOLOGICAL:  deep_fishery, coastal_fishery, river_fishery, fertile_farmland, grazing_land, orchard, ancient_forest, managed_woodland, rare_herbs
TRADE:       natural_harbor, river_ford, mountain_pass, trade_crossroads, oasis, river_confluence
SPECIAL:     arcane_nexus, ancient_ruins, volcanic_soil, hot_springs

PLACEMENT RULES (earth-like realism):
- Coastlines: 1–3 natural_harbor or coastal_fishery per significant coast stretch
- Rivers: river_fishery every ~5% of river length; river_ford at shallow crossings; river_confluence where rivers meet
- Mountain ranges: clusters of iron_deposit, stone_quarry, coal_seam; 1–2 gold_vein or silver_vein per range
- River valleys: highest density of fertile_farmland (Nile effect — most civilizations develop here)
- Plains/grassland: fertile_farmland every 8–12% of area; grazing_land in drier sections
- Forest: ancient_forest in dense cores; managed_woodland at forest edges; rare_herbs at ecotones
- Desert: salt_flat in dry lake beds; oasis at prominent landscape features; gem_cluster in rocky desert
- Volcanic: sulfur_vent, volcanic_soil, hot_springs near volcanic features
- Points should cluster in rich areas and thin out in barren ones
- CRITICAL: Do NOT place resources in geometric patterns — no straight lines, no diagonals, no X-shapes, no W-shapes, no grid patterns, no radial symmetry. Scatter them organically following the terrain contours, rivers, and coastlines.

OUTPUT FORMAT — respond ONLY with a JSON object containing a "resource_points" array, no prose:
{
  "resource_points": [
    {
      "x_pct": 0.42,
      "y_pct": 0.31,
      "resource_type": "iron_deposit",
      "richness": 0.75,
      "name": "The Ironwall Seam",
      "influence_radius_pct": 0.08
    }
  ]
}

Rules:
- richness in [0.1, 1.0] — reflect local abundance realistically
- influence_radius_pct: 0.04 for small/rare deposits; 0.08 default; 0.12 for major resources
- name: optional, leave null if no natural name comes to mind
- Never place ocean/deep_sea resources inland or freshwater resources in salt water`

export function buildResourcePlacementUserPrompt(input: ResourcePlacementInput): string {
  const { map_size, terrain_summary, terrain_blob_count } = input
  const pb = PER_BLOB[map_size] ?? PER_BLOB.region
  const abs = ABSOLUTE[map_size] ?? ABSOLUTE.region
  const n = terrain_blob_count ?? 10
  const min = Math.round(Math.max(abs.min, n * pb.min))
  const max = Math.round(Math.min(abs.max, n * pb.max))

  return [
    `Place resource points on this ${map_size}-scale fantasy map.`,
    `This map has ${n} terrain areas. Target ${min}–${max} total resource points (proportional to terrain variety).`,
    ``,
    `Terrain on this map:`,
    terrain_summary,
    ``,
    `Place resources realistically according to the terrain. Return only the JSON object with a resource_points array.`,
  ].join('\n')
}
