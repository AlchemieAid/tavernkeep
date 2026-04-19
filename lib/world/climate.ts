export type ClimateZone =
  | 'tropical'
  | 'subtropical'
  | 'temperate_maritime'
  | 'temperate_continental'
  | 'mediterranean'
  | 'subarctic'
  | 'arctic'
  | 'highland'
  | 'arid'
  | 'semi_arid'

export interface ClimateData {
  climate_zone: ClimateZone
  temp_summer_high_c: number
  temp_winter_low_c: number
  annual_rainfall_mm: number
  growing_season_months: number
  snowfall_likely: boolean
  pass_open_months: number
}

interface ClimateInput {
  terrain_type: string
  elevation_m: number
  water_access: number
  biome_profile?: string
}

const ZONE_BASE_SUMMER_TEMP: Record<ClimateZone, number> = {
  tropical:               32,
  subtropical:            28,
  temperate_maritime:     18,
  temperate_continental:  20,
  mediterranean:          26,
  subarctic:               8,
  arctic:                 -5,
  highland:               12,
  arid:                   36,
  semi_arid:              28,
}

const ZONE_BASE_WINTER_TEMP: Record<ClimateZone, number> = {
  tropical:               22,
  subtropical:            10,
  temperate_maritime:      5,
  temperate_continental:  -8,
  mediterranean:           8,
  subarctic:             -20,
  arctic:                -40,
  highland:               -5,
  arid:                    5,
  semi_arid:               0,
}

const ZONE_RAINFALL_MM: Record<ClimateZone, number> = {
  tropical:              2200,
  subtropical:           1000,
  temperate_maritime:    1200,
  temperate_continental:  600,
  mediterranean:          500,
  subarctic:              400,
  arctic:                 200,
  highland:               600,
  arid:                   120,
  semi_arid:              350,
}

function deriveClimateZone(terrain_type: string, elevation_m: number, water_access: number, biome_profile?: string): ClimateZone {
  const isWater = ['ocean', 'deep_sea', 'coast', 'river', 'lake', 'swamp', 'wetlands'].includes(terrain_type)
  const isCoastal = isWater || water_access > 0.7
  const isDesert = terrain_type === 'desert' || terrain_type === 'badlands'

  if (biome_profile === 'arctic' || terrain_type === 'arctic')    return 'arctic'
  if (biome_profile === 'arid'   || isDesert)                     return 'arid'
  if (biome_profile === 'tropical')                               return 'tropical'
  if (elevation_m > 2000)                                         return 'highland'
  if (elevation_m > 1500 && !isCoastal)                           return 'subarctic'
  if (terrain_type === 'tundra')                                  return 'subarctic'
  if (biome_profile === 'archipelago' && isCoastal)               return 'tropical'
  if (isCoastal && elevation_m < 500)                             return 'temperate_maritime'
  if (terrain_type === 'highlands' || terrain_type === 'high_mountains') return 'highland'
  return 'temperate_continental'
}

export function deriveClimate(input: ClimateInput): ClimateData {
  const zone = deriveClimateZone(input.terrain_type, input.elevation_m, input.water_access, input.biome_profile)

  const LAPSE_RATE = 6.5 / 1000
  const elevationPenalty = input.elevation_m * LAPSE_RATE

  const isMountain = ['mountains', 'high_mountains', 'highlands'].includes(input.terrain_type)
  const isCoastal  = input.water_access > 0.6

  let summerTemp = ZONE_BASE_SUMMER_TEMP[zone] - elevationPenalty
  let winterTemp = ZONE_BASE_WINTER_TEMP[zone] - elevationPenalty
  if (isCoastal) { summerTemp -= 4; winterTemp += 5 }

  const rainfall = ZONE_RAINFALL_MM[zone]
  const growingMonths = Math.max(0, Math.min(12,
    Math.round((winterTemp > 5 ? 12 : Math.max(0, 12 - ((5 - winterTemp) * 1.2))))
  ))
  const snowfall = winterTemp < 0
  let passOpenMonths = 12
  if (isMountain) {
    passOpenMonths = Math.max(0, 7 - Math.floor((input.elevation_m - 1500) / 500))
  }

  return {
    climate_zone:          zone,
    temp_summer_high_c:    Math.round(summerTemp * 10) / 10,
    temp_winter_low_c:     Math.round(winterTemp * 10) / 10,
    annual_rainfall_mm:    rainfall,
    growing_season_months: growingMonths,
    snowfall_likely:       snowfall,
    pass_open_months:      passOpenMonths,
  }
}
