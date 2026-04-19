export type HazardType =
  | 'avalanche'
  | 'flash_flood'
  | 'rockfall'
  | 'quicksand'
  | 'sandstorm'
  | 'wildfire'
  | 'blizzard'
  | 'volcanic'

export type HazardSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'any'
export type HazardProbability = 'rare' | 'moderate' | 'high'

export interface Hazard {
  type: HazardType
  season: HazardSeason
  probability: HazardProbability
}

interface HazardInput {
  terrain_type: string
  elevation_m: number
  temp_winter_low_c: number
  annual_rainfall_mm: number
  growing_season_months: number
}

export function deriveHazards(input: HazardInput): Hazard[] {
  const hazards: Hazard[] = []
  const { terrain_type, elevation_m, temp_winter_low_c, annual_rainfall_mm, growing_season_months } = input

  if (['mountains', 'high_mountains'].includes(terrain_type)) {
    hazards.push({
      type: 'avalanche',
      season: 'spring',
      probability: elevation_m > 2500 ? 'high' : 'moderate',
    })
    hazards.push({ type: 'rockfall', season: 'spring', probability: 'moderate' })
    if (temp_winter_low_c < -10) {
      hazards.push({ type: 'blizzard', season: 'winter', probability: 'high' })
    }
  }

  if (['hills', 'highlands'].includes(terrain_type)) {
    hazards.push({ type: 'rockfall', season: 'spring', probability: 'rare' })
  }

  if (['river', 'swamp', 'wetlands'].includes(terrain_type)) {
    hazards.push({ type: 'flash_flood', season: 'spring', probability: 'moderate' })
  }

  if (['plains', 'grassland', 'farmland'].includes(terrain_type)) {
    hazards.push({ type: 'flash_flood', season: 'summer', probability: 'rare' })
  }

  if (['swamp', 'wetlands'].includes(terrain_type)) {
    hazards.push({ type: 'quicksand', season: 'any', probability: 'rare' })
  }

  if (['desert', 'badlands'].includes(terrain_type)) {
    hazards.push({ type: 'sandstorm', season: 'summer', probability: 'moderate' })
  }

  if (['forest', 'grassland', 'plains'].includes(terrain_type)) {
    if (growing_season_months > 6 && annual_rainfall_mm < 600) {
      hazards.push({ type: 'wildfire', season: 'summer', probability: 'moderate' })
    }
  }

  if (['tundra', 'arctic'].includes(terrain_type)) {
    hazards.push({ type: 'blizzard', season: 'winter', probability: temp_winter_low_c < -10 ? 'high' : 'moderate' })
  }

  if (terrain_type === 'volcanic') {
    hazards.push({ type: 'volcanic', season: 'any', probability: 'rare' })
  }

  return hazards
}
