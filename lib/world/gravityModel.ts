import { euclideanDistance } from './spatialIndex'

export interface TownNode {
  id: string
  x_pct: number
  y_pct: number
  wealth_score: number
  town_tier: string
  name?: string | null
}

export interface TradePartner {
  town_id: string
  town_name: string | null
  gravity_score: number
  distance_pct: number
}

const TIER_MASS: Record<string, number> = {
  hamlet:     1,
  village:    3,
  town:       8,
  city:       20,
  metropolis: 50,
}

export function computeGravityScore(
  sourceWealth: number,
  sourceTier: string,
  targetWealth: number,
  targetTier: string,
  distance: number,
): number {
  if (distance < 1e-10) return 0
  const massA = (TIER_MASS[sourceTier] ?? 1) * (1 + sourceWealth)
  const massB = (TIER_MASS[targetTier] ?? 1) * (1 + targetWealth)
  return (massA * massB) / (distance * distance)
}

export function findTradePartners(
  source: TownNode,
  allTowns: TownNode[],
  maxPartners = 4,
): TradePartner[] {
  const scores: TradePartner[] = []

  for (const town of allTowns) {
    if (town.id === source.id) continue
    const dist = euclideanDistance(source.x_pct, source.y_pct, town.x_pct, town.y_pct)
    const gravity = computeGravityScore(
      source.wealth_score, source.town_tier,
      town.wealth_score, town.town_tier,
      dist,
    )
    scores.push({
      town_id:     town.id,
      town_name:   town.name ?? null,
      gravity_score: Math.round(gravity * 1000) / 1000,
      distance_pct:  Math.round(dist * 1000) / 1000,
    })
  }

  return scores
    .sort((a, b) => b.gravity_score - a.gravity_score)
    .slice(0, maxPartners)
}
