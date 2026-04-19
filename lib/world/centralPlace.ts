import type { ResourceScores } from './terrainScores'

export type TownTier = 'hamlet' | 'village' | 'town' | 'city' | 'metropolis'

export interface TownTierResult {
  tier: TownTier
  specializations: string[]
}

const TIER_THRESHOLDS: Array<{ min: number; tier: TownTier }> = [
  { min: 0.70, tier: 'metropolis' },
  { min: 0.55, tier: 'city'       },
  { min: 0.38, tier: 'town'       },
  { min: 0.22, tier: 'village'    },
  { min: 0.00, tier: 'hamlet'     },
]

export function deriveTownTier(wealthScore: number): TownTier {
  for (const threshold of TIER_THRESHOLDS) {
    if (wealthScore >= threshold.min) return threshold.tier
  }
  return 'hamlet'
}

const SPECIALIZATION_THRESHOLDS: Array<{ dim: keyof ResourceScores; threshold: number; label: string }> = [
  { dim: 'mining',       threshold: 0.50, label: 'Mining'     },
  { dim: 'agriculture',  threshold: 0.55, label: 'Agriculture'},
  { dim: 'fishing',      threshold: 0.50, label: 'Fishing'    },
  { dim: 'forestry',     threshold: 0.50, label: 'Forestry'   },
  { dim: 'trade_access', threshold: 0.55, label: 'Trade'      },
  { dim: 'water_access', threshold: 0.65, label: 'Maritime'   },
  { dim: 'wealth',       threshold: 0.60, label: 'Crafts'     },
]

export function deriveSpecializations(scores: ResourceScores): string[] {
  return SPECIALIZATION_THRESHOLDS
    .filter(s => scores[s.dim] >= s.threshold)
    .map(s => s.label)
    .slice(0, 3)
}

export function deriveTownProfile(wealthScore: number, scores: ResourceScores): TownTierResult {
  return {
    tier: deriveTownTier(wealthScore),
    specializations: deriveSpecializations(scores),
  }
}
