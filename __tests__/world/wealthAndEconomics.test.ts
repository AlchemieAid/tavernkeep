import { describe, it, expect } from 'vitest'
import { computeWealthScore, wealthLabel, estimatePopulation } from '../../lib/world/wealthField'
import { computeGravityScore, findTradePartners, type TownNode } from '../../lib/world/gravityModel'
import { deriveTownTier, deriveSpecializations, deriveTownProfile } from '../../lib/world/centralPlace'
import { computePriceIndex, priceModifiers } from '../../lib/world/priceIndex'
import type { ResourceScores } from '../../lib/world/terrainScores'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const RICH_SCORES: ResourceScores = {
  agriculture: 0.9, fishing: 0.6, forestry: 0.7,
  mining: 0.8, trade_access: 0.9, water_access: 0.7, wealth: 0.8,
}

const POOR_SCORES: ResourceScores = {
  agriculture: 0.1, fishing: 0.05, forestry: 0.05,
  mining: 0.05, trade_access: 0.05, water_access: 0.05, wealth: 0.05,
}

const MINING_SCORES: ResourceScores = {
  agriculture: 0.1, fishing: 0.0, forestry: 0.1,
  mining: 0.9, trade_access: 0.3, water_access: 0.1, wealth: 0.2,
}

// ── Wealth Field ─────────────────────────────────────────────────────────────

describe('wealthField', () => {
  describe('computeWealthScore', () => {
    it('returns value between 0 and 1', () => {
      const w = computeWealthScore(RICH_SCORES)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    })

    it('rich scores produce higher wealth than poor scores', () => {
      expect(computeWealthScore(RICH_SCORES)).toBeGreaterThan(computeWealthScore(POOR_SCORES))
    })

    it('zero scores produce near-zero wealth', () => {
      const zero: ResourceScores = { agriculture: 0, fishing: 0, forestry: 0, mining: 0, trade_access: 0, water_access: 0, wealth: 0 }
      expect(computeWealthScore(zero)).toBe(0)
    })
  })

  describe('wealthLabel', () => {
    it('labels 0 as Destitute', () => {
      expect(wealthLabel(0)).toBe('Destitute')
    })
    it('labels 0.5 as Comfortable or Wealthy', () => {
      const label = wealthLabel(0.5)
      expect(['Comfortable', 'Wealthy']).toContain(label)
    })
    it('labels 1.0 as Opulent', () => {
      expect(wealthLabel(1.0)).toBe('Opulent')
    })
    it('covers all thresholds in sequence', () => {
      const labels = [0.05, 0.15, 0.28, 0.42, 0.58, 0.72, 0.90].map(wealthLabel)
      const unique = new Set(labels)
      expect(unique.size).toBeGreaterThanOrEqual(5)
    })
  })

  describe('estimatePopulation', () => {
    it('hamlet has lower population than city', () => {
      const hamlet = estimatePopulation(0.3, 'hamlet')
      const city   = estimatePopulation(0.3, 'city')
      expect(city.min).toBeGreaterThan(hamlet.max)
    })

    it('wealthier towns have higher population estimates', () => {
      const poor = estimatePopulation(0.1, 'town')
      const rich = estimatePopulation(0.9, 'town')
      expect(rich.max).toBeGreaterThan(poor.max)
    })

    it('min is less than max', () => {
      for (const tier of ['hamlet', 'village', 'town', 'city', 'metropolis']) {
        const p = estimatePopulation(0.5, tier)
        expect(p.min).toBeLessThan(p.max)
      }
    })
  })
})

// ── Gravity Model ─────────────────────────────────────────────────────────────

describe('gravityModel', () => {
  describe('computeGravityScore', () => {
    it('returns 0 for zero distance', () => {
      expect(computeGravityScore(0.5, 'town', 0.5, 'town', 0)).toBe(0)
    })

    it('increases as distance decreases', () => {
      const close = computeGravityScore(0.5, 'town', 0.5, 'town', 0.1)
      const far   = computeGravityScore(0.5, 'town', 0.5, 'town', 0.5)
      expect(close).toBeGreaterThan(far)
    })

    it('metropolis attracts more than hamlet at same distance', () => {
      const metro  = computeGravityScore(0.5, 'town', 0.5, 'metropolis', 0.2)
      const hamlet = computeGravityScore(0.5, 'town', 0.5, 'hamlet',     0.2)
      expect(metro).toBeGreaterThan(hamlet)
    })
  })

  describe('findTradePartners', () => {
    const towns: TownNode[] = [
      { id: 'A', x_pct: 0.5, y_pct: 0.5, wealth_score: 0.7, town_tier: 'city',    name: 'Capital' },
      { id: 'B', x_pct: 0.6, y_pct: 0.5, wealth_score: 0.4, town_tier: 'town',    name: 'Riverside' },
      { id: 'C', x_pct: 0.9, y_pct: 0.9, wealth_score: 0.2, town_tier: 'village', name: 'Faraway' },
      { id: 'D', x_pct: 0.5, y_pct: 0.6, wealth_score: 0.5, town_tier: 'town',    name: 'Southgate' },
    ]

    it('does not include source town in results', () => {
      const partners = findTradePartners(towns[0], towns)
      expect(partners.every(p => p.town_id !== 'A')).toBe(true)
    })

    it('returns at most maxPartners results', () => {
      const partners = findTradePartners(towns[0], towns, 2)
      expect(partners.length).toBeLessThanOrEqual(2)
    })

    it('nearby wealthy towns rank higher than distant poor ones', () => {
      const partners = findTradePartners(towns[0], towns, 3)
      const partnerIds = partners.map(p => p.town_id)
      const bIndex = partnerIds.indexOf('B')
      const cIndex = partnerIds.indexOf('C')
      // B is close, C is far — B should rank higher than C
      if (bIndex !== -1 && cIndex !== -1) {
        expect(bIndex).toBeLessThan(cIndex)
      }
    })

    it('returns sorted by gravity score descending', () => {
      const partners = findTradePartners(towns[0], towns)
      for (let i = 1; i < partners.length; i++) {
        expect(partners[i - 1].gravity_score).toBeGreaterThanOrEqual(partners[i].gravity_score)
      }
    })
  })
})

// ── Central Place Theory ──────────────────────────────────────────────────────

describe('centralPlace', () => {
  describe('deriveTownTier', () => {
    it('very high wealth → metropolis', () => {
      expect(deriveTownTier(0.75)).toBe('metropolis')
    })
    it('mid-high wealth → city', () => {
      expect(deriveTownTier(0.60)).toBe('city')
    })
    it('mid wealth → town', () => {
      expect(deriveTownTier(0.45)).toBe('town')
    })
    it('low wealth → village', () => {
      expect(deriveTownTier(0.28)).toBe('village')
    })
    it('very low wealth → hamlet', () => {
      expect(deriveTownTier(0.05)).toBe('hamlet')
    })
  })

  describe('deriveSpecializations', () => {
    it('identifies mining specialization from high mining score', () => {
      const specs = deriveSpecializations(MINING_SCORES)
      expect(specs).toContain('Mining')
    })

    it('identifies trade specialization from high trade_access', () => {
      const scores: ResourceScores = { ...POOR_SCORES, trade_access: 0.8 }
      const specs = deriveSpecializations(scores)
      expect(specs).toContain('Trade')
    })

    it('returns at most 3 specializations', () => {
      const specs = deriveSpecializations(RICH_SCORES)
      expect(specs.length).toBeLessThanOrEqual(3)
    })

    it('returns empty for a destitute location', () => {
      const specs = deriveSpecializations(POOR_SCORES)
      expect(specs).toHaveLength(0)
    })
  })

  describe('deriveTownProfile', () => {
    it('rich scores produce a city or metropolis', () => {
      const profile = deriveTownProfile(computeWealthScore(RICH_SCORES), RICH_SCORES)
      expect(['city', 'metropolis']).toContain(profile.tier)
    })

    it('poor scores produce a hamlet or village', () => {
      const profile = deriveTownProfile(computeWealthScore(POOR_SCORES), POOR_SCORES)
      expect(['hamlet', 'village']).toContain(profile.tier)
    })
  })
})

// ── Price Index ───────────────────────────────────────────────────────────────

describe('priceIndex', () => {
  describe('computePriceIndex', () => {
    it('iron-rich region has cheaper weapons_armor', () => {
      const index = computePriceIndex(MINING_SCORES)
      expect(index.weapons_armor).toBeLessThan(1.0)
    })

    it('farmland-rich region has cheaper food_drink', () => {
      const scores: ResourceScores = { ...POOR_SCORES, agriculture: 0.9, water_access: 0.5 }
      const index = computePriceIndex(scores)
      expect(index.food_drink).toBeLessThan(1.0)
    })

    it('poor trade_access raises trade_goods price', () => {
      const isolated: ResourceScores = { ...POOR_SCORES, trade_access: 0.0 }
      const hub:      ResourceScores = { ...POOR_SCORES, trade_access: 0.9 }
      expect(computePriceIndex(isolated).trade_goods).toBeGreaterThan(computePriceIndex(hub).trade_goods)
    })

    it('all price modifiers are clamped to [0.3, 2.5]', () => {
      for (const scores of [RICH_SCORES, POOR_SCORES, MINING_SCORES]) {
        const index = computePriceIndex(scores)
        for (const [k, v] of Object.entries(index)) {
          expect(v, k).toBeGreaterThanOrEqual(0.3)
          expect(v, k).toBeLessThanOrEqual(2.5)
        }
      }
    })
  })

  describe('priceModifiers', () => {
    it('returns 7 modifier entries', () => {
      const index = computePriceIndex(RICH_SCORES)
      const mods  = priceModifiers(index)
      expect(mods).toHaveLength(7)
    })

    it('direction is cheaper when modifier < 0.85', () => {
      const index = computePriceIndex(MINING_SCORES)
      const mods  = priceModifiers(index)
      const weaponsMod = mods.find(m => m.category === 'weapons_armor')!
      if (weaponsMod.modifier < 0.85) {
        expect(weaponsMod.direction).toBe('cheaper')
      }
    })

    it('direction is expensive when modifier > 1.15', () => {
      const index = computePriceIndex(POOR_SCORES)
      const mods  = priceModifiers(index)
      const anyExpensive = mods.some(m => m.modifier > 1.15)
      if (anyExpensive) {
        const expensive = mods.filter(m => m.modifier > 1.15)
        expect(expensive.every(m => m.direction === 'expensive')).toBe(true)
      }
    })

    it('each modifier has a non-empty reason string', () => {
      const index = computePriceIndex(RICH_SCORES)
      const mods  = priceModifiers(index)
      for (const m of mods) {
        expect(m.reason.length).toBeGreaterThan(0)
      }
    })
  })
})
