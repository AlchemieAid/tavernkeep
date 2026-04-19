import { describe, it, expect } from 'vitest'
import {
  TERRAIN_BASE_SCORES,
  RESOURCE_DIMENSIONS,
  ZERO_SCORES,
  clampScore,
  clampScores,
  addScores,
  type ResourceScores,
} from '../../lib/world/terrainScores'

describe('terrainScores', () => {
  describe('TERRAIN_BASE_SCORES', () => {
    it('has entries for all 22 terrain types', () => {
      const types = [
        'ocean','deep_sea','coast','river','lake',
        'plains','grassland','farmland',
        'forest','deep_forest','jungle',
        'hills','highlands','mountains','high_mountains',
        'swamp','wetlands','desert','badlands',
        'tundra','arctic','volcanic',
      ]
      for (const t of types) {
        expect(TERRAIN_BASE_SCORES[t], `Missing terrain: ${t}`).toBeDefined()
      }
    })

    it('all scores are between 0 and 1', () => {
      for (const [terrain, scores] of Object.entries(TERRAIN_BASE_SCORES)) {
        for (const [dim, val] of Object.entries(scores)) {
          expect(val, `${terrain}.${dim} out of range`).toBeGreaterThanOrEqual(0)
          expect(val, `${terrain}.${dim} out of range`).toBeLessThanOrEqual(1)
        }
      }
    })

    it('ocean has zero agriculture', () => {
      expect(TERRAIN_BASE_SCORES.ocean.agriculture).toBe(0)
    })

    it('farmland has highest agriculture score', () => {
      const farmAg = TERRAIN_BASE_SCORES.farmland.agriculture
      expect(farmAg).toBeGreaterThan(0.8)
    })

    it('mountains have high mining score', () => {
      expect(TERRAIN_BASE_SCORES.mountains.mining).toBeGreaterThan(0.6)
    })

    it('coast has high fishing and trade_access', () => {
      expect(TERRAIN_BASE_SCORES.coast.fishing).toBeGreaterThan(0.5)
      expect(TERRAIN_BASE_SCORES.coast.trade_access).toBeGreaterThan(0.5)
    })
  })

  describe('RESOURCE_DIMENSIONS', () => {
    it('iron_deposit contributes fully to mining', () => {
      expect(RESOURCE_DIMENSIONS.iron_deposit?.mining).toBe(1.0)
    })

    it('gold_vein contributes to both mining and wealth', () => {
      expect(RESOURCE_DIMENSIONS.gold_vein?.mining).toBeGreaterThan(0)
      expect(RESOURCE_DIMENSIONS.gold_vein?.wealth).toBeGreaterThan(0)
    })

    it('natural_harbor contributes to trade_access', () => {
      expect(RESOURCE_DIMENSIONS.natural_harbor?.trade_access).toBe(1.0)
    })

    it('fertile_farmland contributes fully to agriculture', () => {
      expect(RESOURCE_DIMENSIONS.fertile_farmland?.agriculture).toBe(1.0)
    })

    it('ancient_forest contributes fully to forestry', () => {
      expect(RESOURCE_DIMENSIONS.ancient_forest?.forestry).toBe(1.0)
    })

    it('all dimension weights are between 0 and 1', () => {
      for (const [type, dims] of Object.entries(RESOURCE_DIMENSIONS)) {
        for (const [dim, val] of Object.entries(dims)) {
          expect(val, `${type}.${dim}`).toBeGreaterThanOrEqual(0)
          expect(val, `${type}.${dim}`).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  describe('ZERO_SCORES', () => {
    it('all values are 0', () => {
      for (const val of Object.values(ZERO_SCORES)) {
        expect(val).toBe(0)
      }
    })
  })

  describe('clampScore', () => {
    it('clamps values above 1 to 1', () => {
      expect(clampScore(1.5)).toBe(1)
    })
    it('clamps values below 0 to 0', () => {
      expect(clampScore(-0.5)).toBe(0)
    })
    it('passes through valid values', () => {
      expect(clampScore(0.75)).toBe(0.75)
    })
  })

  describe('clampScores', () => {
    it('clamps all dimensions', () => {
      const scores: ResourceScores = {
        agriculture: 1.5, fishing: -0.2, forestry: 0.5,
        mining: 2.0, trade_access: 0.3, water_access: -1, wealth: 0.8,
      }
      const clamped = clampScores(scores)
      expect(clamped.agriculture).toBe(1)
      expect(clamped.fishing).toBe(0)
      expect(clamped.mining).toBe(1)
      expect(clamped.water_access).toBe(0)
      expect(clamped.forestry).toBe(0.5)
    })
  })

  describe('addScores', () => {
    it('adds partial scores correctly', () => {
      const base: ResourceScores = { agriculture: 0.5, fishing: 0.3, forestry: 0.2, mining: 0.4, trade_access: 0.6, water_access: 0.5, wealth: 0.3 }
      const result = addScores(base, { agriculture: 0.2, wealth: 0.1 })
      expect(result.agriculture).toBeCloseTo(0.7)
      expect(result.fishing).toBeCloseTo(0.3)
      expect(result.wealth).toBeCloseTo(0.4)
    })
  })
})
