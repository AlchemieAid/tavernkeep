import { describe, it, expect } from 'vitest'
import { deriveClimate } from '../../lib/world/climate'

describe('climate', () => {
  it('classifies arctic terrain as arctic zone', () => {
    const c = deriveClimate({ terrain_type: 'arctic', elevation_m: 100, water_access: 0.1 })
    expect(c.climate_zone).toBe('arctic')
  })

  it('classifies desert terrain as arid zone', () => {
    const c = deriveClimate({ terrain_type: 'desert', elevation_m: 300, water_access: 0.05 })
    expect(c.climate_zone).toBe('arid')
  })

  it('classifies high elevation (>2000m) as highland', () => {
    const c = deriveClimate({ terrain_type: 'mountains', elevation_m: 2500, water_access: 0.2 })
    expect(c.climate_zone).toBe('highland')
  })

  it('classifies coastal low elevation as temperate_maritime', () => {
    const c = deriveClimate({ terrain_type: 'coast', elevation_m: 10, water_access: 0.8 })
    expect(c.climate_zone).toBe('temperate_maritime')
  })

  it('applies lapse rate — highland is colder than lowland same zone', () => {
    const low  = deriveClimate({ terrain_type: 'plains', elevation_m: 100, water_access: 0.2 })
    const high = deriveClimate({ terrain_type: 'mountains', elevation_m: 2500, water_access: 0.2 })
    expect(high.temp_summer_high_c).toBeLessThan(low.temp_summer_high_c)
  })

  it('snowfall is true when winter temp is below 0', () => {
    const c = deriveClimate({ terrain_type: 'tundra', elevation_m: 200, water_access: 0.1 })
    expect(c.temp_winter_low_c).toBeLessThan(0)
    expect(c.snowfall_likely).toBe(true)
  })

  it('tropical biome profile forces tropical zone', () => {
    const c = deriveClimate({ terrain_type: 'plains', elevation_m: 50, water_access: 0.3, biome_profile: 'tropical' })
    expect(c.climate_zone).toBe('tropical')
  })

  it('mountain pass_open_months is less than 12 for high mountains', () => {
    const c = deriveClimate({ terrain_type: 'mountains', elevation_m: 2500, water_access: 0.1 })
    expect(c.pass_open_months).toBeLessThan(12)
  })

  it('growing_season_months is between 0 and 12', () => {
    const terrains = ['plains', 'desert', 'arctic', 'farmland', 'tundra']
    for (const t of terrains) {
      const c = deriveClimate({ terrain_type: t, elevation_m: 100, water_access: 0.3 })
      expect(c.growing_season_months, `${t}`).toBeGreaterThanOrEqual(0)
      expect(c.growing_season_months, `${t}`).toBeLessThanOrEqual(12)
    }
  })
})
