import type { ResourceScores } from './terrainScores'

export type WealthLabel =
  | 'Destitute'
  | 'Poor'
  | 'Modest'
  | 'Comfortable'
  | 'Wealthy'
  | 'Prosperous'
  | 'Opulent'

const WEALTH_DIMENSION_WEIGHTS: Record<keyof ResourceScores, number> = {
  agriculture:  0.25,
  fishing:      0.10,
  forestry:     0.10,
  mining:       0.20,
  trade_access: 0.20,
  water_access: 0.05,
  wealth:       0.10,
}

export function computeWealthScore(scores: ResourceScores): number {
  let total = 0
  let weightSum = 0
  for (const dim of Object.keys(WEALTH_DIMENSION_WEIGHTS) as Array<keyof ResourceScores>) {
    total     += scores[dim] * WEALTH_DIMENSION_WEIGHTS[dim]
    weightSum += WEALTH_DIMENSION_WEIGHTS[dim]
  }
  return Math.round((total / weightSum) * 1000) / 1000
}

export function wealthLabel(score: number): WealthLabel {
  if (score < 0.10) return 'Destitute'
  if (score < 0.22) return 'Poor'
  if (score < 0.36) return 'Modest'
  if (score < 0.50) return 'Comfortable'
  if (score < 0.65) return 'Wealthy'
  if (score < 0.80) return 'Prosperous'
  return 'Opulent'
}

export function estimatePopulation(wealthScore: number, townTier: string): { min: number; max: number } {
  const TIER_RANGES: Record<string, { min: number; max: number }> = {
    hamlet:     { min: 20,     max: 300    },
    village:    { min: 300,    max: 1500   },
    town:       { min: 1500,   max: 8000   },
    city:       { min: 8000,   max: 50000  },
    metropolis: { min: 50000,  max: 250000 },
  }
  const base = TIER_RANGES[townTier] ?? { min: 100, max: 1000 }
  const spread = base.max - base.min
  const wealthFactor = 0.5 + wealthScore * 0.8
  const midpoint = base.min + spread * Math.min(1, wealthFactor)
  return {
    min: Math.round(midpoint * 0.7),
    max: Math.round(midpoint * 1.3),
  }
}
