import { computeIDWWithTerrain, type ResourcePoint, type TerrainArea, type PlacedPoI } from './resourceInterpolation'
import { computeWealthScore, wealthLabel, estimatePopulation } from './wealthField'
import { findTradePartners, type TownNode } from './gravityModel'
import { deriveTownProfile } from './centralPlace'
import { computePriceIndex, priceModifiers } from './priceIndex'
import { deriveClimate, type ClimateData } from './climate'
import { computeTravelTime, formatTravelTime } from './travelTime'
import { computeVisibility } from './visibility'
import { deriveHazards, type Hazard } from './hazards'
import { deriveEcosystem, type EcosystemData } from './ecosystem'
import { elevationLabel, terrainMidpointElevation } from './elevation'
import type { ResourceScores } from './terrainScores'
import type { PriceIndex } from './priceIndex'
import type { TownTier } from './centralPlace'
import type { VisibilityResult } from './visibility'

export interface WorldBuilderInput {
  qx: number
  qy: number
  resourcePoints: ResourcePoint[]
  terrainAreas: TerrainArea[]
  pois?: PlacedPoI[]
  existingTowns?: TownNode[]
  biome_profile?: string
  map_size?: 'region' | 'kingdom' | 'continent'
}

export interface ResourceSnapshot {
  scores: ResourceScores
  elevation_m: number
  elevation_label: string
  dominant_terrain: string
}

export interface ClimateSnapshot extends ClimateData {}

export interface GeographicContext {
  resource: ResourceSnapshot
  climate: ClimateSnapshot
  visibility: VisibilityResult
  travel_to_hub: string | null
  hazards: Hazard[]
  ecosystem: EcosystemData
}

export interface EconomicContext {
  wealth_score: number
  wealth_label: string
  town_tier: TownTier
  specializations: string[]
  trade_partners: ReturnType<typeof findTradePartners>
  price_index: PriceIndex
  price_modifiers: ReturnType<typeof priceModifiers>
  population_range: { min: number; max: number }
}

export interface WorldBuilderResult {
  geographic: GeographicContext
  economic: EconomicContext
}

export function buildWorldContext(input: WorldBuilderInput): WorldBuilderResult {
  const { qx, qy, resourcePoints, terrainAreas, pois = [], existingTowns = [], biome_profile } = input

  // ── 1. IDW: resource scores + elevation ──────────────────────────────────
  const idw = computeIDWWithTerrain(qx, qy, resourcePoints, terrainAreas, pois)
  const { scores, elevation_m, dominantTerrain } = idw

  const resource: ResourceSnapshot = {
    scores,
    elevation_m,
    elevation_label: elevationLabel(elevation_m),
    dominant_terrain: dominantTerrain,
  }

  // ── 2. Climate ────────────────────────────────────────────────────────────
  const climate = deriveClimate({
    terrain_type: dominantTerrain,
    elevation_m,
    water_access: scores.water_access,
    biome_profile,
  })

  // ── 3. Visibility ─────────────────────────────────────────────────────────
  const visibility = computeVisibility(elevation_m, dominantTerrain)

  // ── 4. Nearest town travel time (to closest existing town) ────────────────
  let travel_to_hub: string | null = null
  if (existingTowns.length > 0) {
    const nearest = existingTowns.reduce((best, t) => {
      const d = Math.hypot(t.x_pct - qx, t.y_pct - qy)
      const bd = Math.hypot(best.x_pct - qx, best.y_pct - qy)
      return d < bd ? t : best
    })
    const distanceKm = Math.hypot(nearest.x_pct - qx, nearest.y_pct - qy) * 500
    const travelResult = computeTravelTime(distanceKm, dominantTerrain, 0, {
      isMountainPass: ['mountains', 'high_mountains'].includes(dominantTerrain),
      pass_open_months: climate.pass_open_months,
      season: 'summer',
    } as Parameters<typeof computeTravelTime>[3])
    travel_to_hub = formatTravelTime(travelResult)
  }

  // ── 5. Hazards ────────────────────────────────────────────────────────────
  const hazards = deriveHazards({
    terrain_type: dominantTerrain,
    elevation_m,
    temp_winter_low_c: climate.temp_winter_low_c,
    annual_rainfall_mm: climate.annual_rainfall_mm,
    growing_season_months: climate.growing_season_months,
  })

  // ── 6. Ecosystem ──────────────────────────────────────────────────────────
  const ecosystem = deriveEcosystem({
    terrain_type: dominantTerrain,
    climate_zone: climate.climate_zone,
    elevation_m,
  })

  // ── 7. Wealth & town profile ──────────────────────────────────────────────
  const wealth_score = computeWealthScore(scores)
  const { tier: town_tier, specializations } = deriveTownProfile(wealth_score, scores)

  // ── 8. Trade partners (gravity model) ────────────────────────────────────
  const syntheticSource: TownNode = {
    id: '__preview__',
    x_pct: qx,
    y_pct: qy,
    wealth_score,
    town_tier,
    name: null,
  }
  const trade_partners = findTradePartners(syntheticSource, existingTowns, 4)

  // ── 9. Price index ────────────────────────────────────────────────────────
  const price_index = computePriceIndex(scores)
  const price_mods  = priceModifiers(price_index)

  // ── 10. Population estimate ───────────────────────────────────────────────
  const population_range = estimatePopulation(wealth_score, town_tier)

  return {
    geographic: {
      resource,
      climate,
      visibility,
      travel_to_hub,
      hazards,
      ecosystem,
    },
    economic: {
      wealth_score,
      wealth_label: wealthLabel(wealth_score),
      town_tier,
      specializations,
      trade_partners,
      price_index,
      price_modifiers: price_mods,
      population_range,
    },
  }
}

export function buildEconomicContextForAI(result: WorldBuilderResult): string {
  const { geographic: geo, economic: econ } = result
  const { resource, climate, hazards, ecosystem } = geo
  const { scores } = resource

  const scoreLines = [
    `Agriculture: ${Math.round(scores.agriculture * 100)}%`,
    `Mining: ${Math.round(scores.mining * 100)}%`,
    `Forestry: ${Math.round(scores.forestry * 100)}%`,
    `Fishing: ${Math.round(scores.fishing * 100)}%`,
    `Trade access: ${Math.round(scores.trade_access * 100)}%`,
    `Water access: ${Math.round(scores.water_access * 100)}%`,
  ].join('\n')

  const hazardLines = hazards.length > 0
    ? hazards.map(h => `${h.type} (${h.season}, ${h.probability})`).join(', ')
    : 'None significant'

  const tradePartnerNames = econ.trade_partners.length > 0
    ? econ.trade_partners.map(p => p.town_name ?? 'unnamed').join(', ')
    : 'None established'

  return `LOCATION CONTEXT:
Terrain: ${resource.dominant_terrain} · ${resource.elevation_label} (~${Math.round(resource.elevation_m)}m)
Climate: ${climate.climate_zone} · Summer ${climate.temp_summer_high_c}°C / Winter ${climate.temp_winter_low_c}°C
Rainfall: ${climate.annual_rainfall_mm}mm/year · Growing season: ${climate.growing_season_months} months
Flora: ${ecosystem.flora.slice(0, 3).join(', ')}
Fauna: ${ecosystem.fauna.slice(0, 3).join(', ')}
Foraging: ${ecosystem.foraging_yield}
Hazards: ${hazardLines}

RESOURCE SCORES:
${scoreLines}

ECONOMIC PROFILE:
Wealth: ${econ.wealth_label} (score: ${econ.wealth_score.toFixed(2)})
Town tier: ${econ.town_tier}
Specializations: ${econ.specializations.join(', ') || 'none'}
Trade partners: ${tradePartnerNames}
Population range: ${econ.population_range.min.toLocaleString()}–${econ.population_range.max.toLocaleString()}

PRICE CONTEXT:
${econ.price_modifiers
  .filter(m => m.direction !== 'normal')
  .map(m => `${m.label}: ${m.direction} — ${m.reason}`)
  .join('\n')}`
}
