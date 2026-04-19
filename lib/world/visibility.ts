export type VisibilityLabel =
  | 'Enclosed < 1km'
  | 'Limited 1–5km'
  | 'Clear 5–20km'
  | 'Sweeping 20–50km'
  | 'Panoramic > 50km'

export interface VisibilityResult {
  range_km: number
  label: VisibilityLabel
}

const TERRAIN_OBSCURANCE: Record<string, number> = {
  deep_forest:    0.05,
  jungle:         0.05,
  forest:         0.15,
  swamp:          0.30,
  wetlands:       0.30,
  hills:          0.60,
  highlands:      0.60,
  plains:         1.00,
  farmland:       1.00,
  grassland:      1.00,
  coast:          1.00,
  mountains:      1.20,
  high_mountains: 1.20,
  river:          0.80,
  lake:           1.00,
  ocean:          1.00,
  desert:         1.00,
  badlands:       0.80,
  tundra:         0.90,
  arctic:         0.90,
  volcanic:       0.70,
}

export function computeVisibility(
  elevationM: number,
  terrainType: string,
  hasWatchtower?: boolean,
): VisibilityResult {
  const horizonKm = 3.57 * Math.sqrt(Math.max(0, elevationM))
  const obscurance = TERRAIN_OBSCURANCE[terrainType] ?? 1.0
  let range_km = horizonKm * obscurance
  if (hasWatchtower) range_km *= 1.5

  let label: VisibilityLabel
  if (range_km < 1)   label = 'Enclosed < 1km'
  else if (range_km < 5)  label = 'Limited 1–5km'
  else if (range_km < 20) label = 'Clear 5–20km'
  else if (range_km < 50) label = 'Sweeping 20–50km'
  else                    label = 'Panoramic > 50km'

  return { range_km: Math.round(range_km * 10) / 10, label }
}
