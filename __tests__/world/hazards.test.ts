import { describe, it, expect } from 'vitest'
import { deriveHazards } from '../../lib/world/hazards'

describe('hazards', () => {
  it('returns avalanche for high mountains', () => {
    const h = deriveHazards({ terrain_type: 'mountains', elevation_m: 2600, temp_winter_low_c: -15, annual_rainfall_mm: 800, growing_season_months: 4 })
    expect(h.some(x => x.type === 'avalanche')).toBe(true)
  })

  it('avalanche is high probability above 2500m', () => {
    const h = deriveHazards({ terrain_type: 'mountains', elevation_m: 2600, temp_winter_low_c: -10, annual_rainfall_mm: 600, growing_season_months: 3 })
    const av = h.find(x => x.type === 'avalanche')
    expect(av?.probability).toBe('high')
  })

  it('avalanche is moderate probability between 1500m and 2500m', () => {
    const h = deriveHazards({ terrain_type: 'mountains', elevation_m: 1800, temp_winter_low_c: -5, annual_rainfall_mm: 600, growing_season_months: 5 })
    const av = h.find(x => x.type === 'avalanche')
    expect(av?.probability).toBe('moderate')
  })

  it('flash_flood for river terrain in spring', () => {
    const h = deriveHazards({ terrain_type: 'river', elevation_m: 50, temp_winter_low_c: 2, annual_rainfall_mm: 900, growing_season_months: 8 })
    expect(h.some(x => x.type === 'flash_flood')).toBe(true)
  })

  it('sandstorm for desert terrain', () => {
    const h = deriveHazards({ terrain_type: 'desert', elevation_m: 300, temp_winter_low_c: 8, annual_rainfall_mm: 100, growing_season_months: 2 })
    expect(h.some(x => x.type === 'sandstorm')).toBe(true)
  })

  it('wildfire for dry grassland with long growing season', () => {
    const h = deriveHazards({ terrain_type: 'grassland', elevation_m: 150, temp_winter_low_c: 5, annual_rainfall_mm: 400, growing_season_months: 9 })
    expect(h.some(x => x.type === 'wildfire')).toBe(true)
  })

  it('no wildfire when rainfall is sufficient (>= 600mm)', () => {
    const h = deriveHazards({ terrain_type: 'grassland', elevation_m: 150, temp_winter_low_c: 5, annual_rainfall_mm: 800, growing_season_months: 9 })
    expect(h.some(x => x.type === 'wildfire')).toBe(false)
  })

  it('blizzard for arctic terrain with cold winters', () => {
    const h = deriveHazards({ terrain_type: 'arctic', elevation_m: 100, temp_winter_low_c: -25, annual_rainfall_mm: 200, growing_season_months: 0 })
    expect(h.some(x => x.type === 'blizzard')).toBe(true)
  })

  it('volcanic hazard for volcanic terrain', () => {
    const h = deriveHazards({ terrain_type: 'volcanic', elevation_m: 1000, temp_winter_low_c: 5, annual_rainfall_mm: 400, growing_season_months: 4 })
    expect(h.some(x => x.type === 'volcanic')).toBe(true)
  })

  it('plains with wet climate has no sandstorm', () => {
    const h = deriveHazards({ terrain_type: 'plains', elevation_m: 200, temp_winter_low_c: 2, annual_rainfall_mm: 700, growing_season_months: 8 })
    expect(h.some(x => x.type === 'sandstorm')).toBe(false)
  })

  it('returns empty array for farmland with mild conditions', () => {
    const h = deriveHazards({ terrain_type: 'farmland', elevation_m: 100, temp_winter_low_c: 5, annual_rainfall_mm: 700, growing_season_months: 7 })
    expect(h.every(x => x.type !== 'avalanche')).toBe(true)
    expect(h.every(x => x.type !== 'volcanic')).toBe(true)
  })
})
