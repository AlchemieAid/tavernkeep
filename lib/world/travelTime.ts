export type TravelMode = 'foot' | 'mounted' | 'cart'

export interface TravelTimeResult {
  days: Record<TravelMode, number | null>
  impassable: boolean
  impassableReason?: string
}

const TRAVEL_SPEED_KM_DAY: Record<TravelMode, number> = {
  foot:    30,
  mounted: 50,
  cart:    20,
}

const TERRAIN_MULTIPLIERS: Record<string, number> = {
  plains:         1.00,
  farmland:       1.00,
  grassland:      0.90,
  coast:          0.90,
  hills:          0.65,
  highlands:      0.55,
  forest:         0.70,
  deep_forest:    0.50,
  jungle:         0.40,
  mountains:      0.35,
  high_mountains: 0.20,
  swamp:          0.30,
  wetlands:       0.40,
  desert:         0.60,
  badlands:       0.50,
  river:          0.50,
  tundra:         0.60,
  arctic:         0.35,
  ocean:          0.00,
  deep_sea:       0.00,
  lake:           0.00,
  volcanic:       0.40,
}

const ELEVATION_PENALTY_PER_100M = 0.05

export function computeTravelTime(
  distanceKm: number,
  terrainType: string,
  elevationClimbM: number,
  options: {
    hasRoad?: boolean
    season?: 'spring' | 'summer' | 'autumn' | 'winter'
    passOpenMonths?: number
    isMountainPass?: boolean
    winterMonth?: boolean
  } = {},
): TravelTimeResult {
  const baseMultiplier = TERRAIN_MULTIPLIERS[terrainType] ?? 0.50

  if (baseMultiplier === 0) {
    return { days: { foot: null, mounted: null, cart: null }, impassable: true, impassableReason: 'Water — no land crossing' }
  }

  if (options.isMountainPass && options.season === 'winter' && (options.passOpenMonths ?? 12) < 12) {
    return { days: { foot: null, mounted: null, cart: null }, impassable: true, impassableReason: `Mountain pass — closed in winter` }
  }

  let multiplier = baseMultiplier
  const elevPenalty = Math.max(0, (elevationClimbM / 100) * ELEVATION_PENALTY_PER_100M)
  multiplier = Math.max(0.1, multiplier - elevPenalty)

  if (options.hasRoad) multiplier = Math.min(1.4, multiplier * 1.4)

  let seasonMod = 1.0
  if (options.season === 'spring' && ['swamp', 'wetlands', 'river'].includes(terrainType)) seasonMod = 0.5
  if (options.season === 'summer' && terrainType === 'desert') seasonMod = 0.8
  if (options.season === 'winter' && terrainType === 'plains') seasonMod = 0.85
  multiplier *= seasonMod

  const result: Record<TravelMode, number | null> = { foot: null, mounted: null, cart: null }
  for (const mode of ['foot', 'mounted', 'cart'] as TravelMode[]) {
    const speed = TRAVEL_SPEED_KM_DAY[mode] * multiplier
    result[mode] = Math.round((distanceKm / speed) * 10) / 10
  }

  return { days: result, impassable: false }
}

export function formatTravelTime(result: TravelTimeResult): string {
  if (result.impassable) return result.impassableReason ?? 'Impassable'
  const { foot, mounted } = result.days
  const parts: string[] = []
  if (foot != null)    parts.push(`${foot}d foot`)
  if (mounted != null) parts.push(`${mounted}d mounted`)
  return parts.join(' · ')
}
