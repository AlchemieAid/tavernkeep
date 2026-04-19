import { describe, it, expect } from 'vitest'
import {
  TERRAIN_ELEVATION_RANGES,
  terrainMidpointElevation,
  elevationLabel,
} from '../../lib/world/elevation'

describe('elevation', () => {
  describe('TERRAIN_ELEVATION_RANGES', () => {
    it('has ranges for all 22 terrain types', () => {
      const types = [
        'ocean','deep_sea','coast','river','lake',
        'plains','grassland','farmland',
        'forest','deep_forest','jungle',
        'hills','highlands','mountains','high_mountains',
        'swamp','wetlands','desert','badlands',
        'tundra','arctic','volcanic',
      ]
      for (const t of types) {
        expect(TERRAIN_ELEVATION_RANGES[t], `Missing: ${t}`).toBeDefined()
      }
    })

    it('ocean and deep_sea are at 0', () => {
      expect(TERRAIN_ELEVATION_RANGES.ocean.min).toBe(0)
      expect(TERRAIN_ELEVATION_RANGES.ocean.max).toBe(0)
      expect(TERRAIN_ELEVATION_RANGES.deep_sea.min).toBe(0)
    })

    it('high_mountains have min above 2000m', () => {
      expect(TERRAIN_ELEVATION_RANGES.high_mountains.min).toBeGreaterThanOrEqual(2000)
    })

    it('swamp is always low (max ≤ 100m)', () => {
      expect(TERRAIN_ELEVATION_RANGES.swamp.max).toBeLessThanOrEqual(100)
    })

    it('all ranges have min ≤ max', () => {
      for (const [t, r] of Object.entries(TERRAIN_ELEVATION_RANGES)) {
        expect(r.min, `${t}: min > max`).toBeLessThanOrEqual(r.max)
      }
    })
  })

  describe('terrainMidpointElevation', () => {
    it('returns midpoint of plains range', () => {
      const range = TERRAIN_ELEVATION_RANGES.plains
      expect(terrainMidpointElevation('plains')).toBe((range.min + range.max) / 2)
    })

    it('returns 0 for ocean', () => {
      expect(terrainMidpointElevation('ocean')).toBe(0)
    })

    it('falls back to 100 for unknown terrain', () => {
      expect(terrainMidpointElevation('unknown_terrain')).toBe(100)
    })
  })

  describe('elevationLabel', () => {
    it('labels sea level correctly', () => {
      expect(elevationLabel(0)).toBe('Sea level')
      expect(elevationLabel(5)).toBe('Sea level')
    })

    it('labels lowlands', () => {
      expect(elevationLabel(100)).toBe('Lowlands')
    })

    it('labels uplands', () => {
      expect(elevationLabel(300)).toBe('Uplands')
    })

    it('labels highlands', () => {
      expect(elevationLabel(750)).toBe('Highlands')
    })

    it('labels alpine', () => {
      expect(elevationLabel(1500)).toBe('Alpine')
    })

    it('labels subalpine', () => {
      expect(elevationLabel(2500)).toBe('Subalpine')
    })

    it('labels high alpine peak', () => {
      expect(elevationLabel(4000)).toBe('High alpine peak')
    })
  })
})
