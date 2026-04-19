import { type ResourceScores, RESOURCE_DIMENSIONS, TERRAIN_BASE_SCORES, ZERO_SCORES, clampScores, addScores } from './terrainScores'
import { SpatialIndex, euclideanDistance } from './spatialIndex'
import { POI_DEFINITIONS } from './poiDefinitions'

export interface ResourcePoint {
  id: string
  x_pct: number
  y_pct: number
  resource_type: string
  richness: number
  influence_radius_pct: number
}

export interface PlacedPoI {
  id: string
  x_pct: number
  y_pct: number
  poi_type: string
}

export interface TerrainArea {
  id: string
  terrain_type: string
  polygon: Array<{ x: number; y: number }>
  computed_elevation_m?: number | null
}

export interface IDWResult {
  scores: ResourceScores
  elevation_m: number
  dominantTerrain: string
}

interface SyntheticNode {
  id: string
  x: number
  y: number
  dimensions: Partial<ResourceScores>
  richness: number
  influence_radius: number
}

const POI_INFLUENCE_RADIUS = 0.05

function polygonCentroid(polygon: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (polygon.length === 0) return { x: 0.5, y: 0.5 }
  const sum = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / polygon.length, y: sum.y / polygon.length }
}

function pointInPolygon(px: number, py: number, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

export function buildResourceIndex(points: ResourcePoint[]): SpatialIndex {
  const index = new SpatialIndex()
  index.load(points.map(p => ({
    id: p.id,
    x: p.x_pct,
    y: p.y_pct,
    point: p,
  })))
  return index
}

export function buildPoISyntheticNodes(pois: PlacedPoI[]): SyntheticNode[] {
  return pois.flatMap(poi => {
    const def = POI_DEFINITIONS.find(d => d.type === poi.poi_type)
    if (!def?.economicModifiers) return []
    return [{
      id: `poi_${poi.id}`,
      x: poi.x_pct,
      y: poi.y_pct,
      dimensions: def.economicModifiers,
      richness: 1.0,
      influence_radius: POI_INFLUENCE_RADIUS,
    }]
  })
}

export function computeIDW(
  qx: number,
  qy: number,
  resourcePoints: ResourcePoint[],
  terrainAreas: TerrainArea[],
  pois: PlacedPoI[] = [],
): IDWResult {
  const scores: ResourceScores = { ...ZERO_SCORES }

  // ── Resource point contributions ─────────────────────────────────────────
  let totalWeight = 0
  const dimensionWeightedSums: ResourceScores = { ...ZERO_SCORES }

  for (const rp of resourcePoints) {
    const dist = euclideanDistance(qx, qy, rp.x_pct, rp.y_pct)
    if (dist > rp.influence_radius_pct) continue
    if (dist < 1e-10) {
      // Exact coincidence — cap to avoid infinity
      const dims = RESOURCE_DIMENSIONS[rp.resource_type] ?? {}
      const w = 1e6
      totalWeight += w
      for (const dim of Object.keys(dimensionWeightedSums) as Array<keyof ResourceScores>) {
        dimensionWeightedSums[dim] += rp.richness * (dims[dim] ?? 0) * w
      }
      continue
    }
    const w = 1 / (dist * dist)
    totalWeight += w
    const dims = RESOURCE_DIMENSIONS[rp.resource_type] ?? {}
    for (const dim of Object.keys(dimensionWeightedSums) as Array<keyof ResourceScores>) {
      dimensionWeightedSums[dim] += rp.richness * (dims[dim] ?? 0) * w
    }
  }

  // ── Phase 1: normalise resource-point IDW or fall back to terrain ─────────
  let dominantTerrain = 'plains'

  if (totalWeight > 0) {
    for (const dim of Object.keys(scores) as Array<keyof ResourceScores>) {
      scores[dim] = dimensionWeightedSums[dim] / totalWeight
    }
  } else {
    // No resource points in range — use terrain base scores
    for (const area of terrainAreas) {
      if (pointInPolygon(qx, qy, area.polygon)) {
        dominantTerrain = area.terrain_type
        const base = TERRAIN_BASE_SCORES[area.terrain_type]
        if (base) {
          for (const dim of Object.keys(scores) as Array<keyof ResourceScores>) {
            scores[dim] = base[dim]
          }
        }
        break
      }
    }
    if (totalWeight === 0 && scores.agriculture === 0 && scores.mining === 0) {
      // Not inside any polygon — find nearest terrain centroid
      let minDist = Infinity
      for (const area of terrainAreas) {
        const c = polygonCentroid(area.polygon)
        const d = euclideanDistance(qx, qy, c.x, c.y)
        if (d < minDist) {
          minDist = d
          dominantTerrain = area.terrain_type
          const base = TERRAIN_BASE_SCORES[area.terrain_type]
          if (base) {
            for (const dim of Object.keys(scores) as Array<keyof ResourceScores>) {
              scores[dim] = base[dim]
            }
          }
        }
      }
    }
  }

  // ── Determine dominant terrain for label ─────────────────────────────────
  {
    let minDist = Infinity
    for (const area of terrainAreas) {
      if (pointInPolygon(qx, qy, area.polygon)) {
        dominantTerrain = area.terrain_type
        break
      }
      const c = polygonCentroid(area.polygon)
      const d = euclideanDistance(qx, qy, c.x, c.y)
      if (d < minDist) { minDist = d; dominantTerrain = area.terrain_type }
    }
  }

  // ── Phase 2: apply PoI modifiers ADDITIVELY (distance-weighted falloff) ───
  const syntheticNodes = buildPoISyntheticNodes(pois)
  for (const node of syntheticNodes) {
    const dist = euclideanDistance(qx, qy, node.x, node.y)
    if (dist > node.influence_radius) continue
    // Linear falloff: 1.0 at node centre, 0.0 at edge of influence radius
    const falloff = 1 - dist / node.influence_radius
    for (const dim of Object.keys(scores) as Array<keyof ResourceScores>) {
      const modVal = node.dimensions[dim] ?? 0
      scores[dim] += modVal * falloff
    }
  }

  // ── Elevation IDW from terrain area centroids ─────────────────────────────
  let elevWeightedSum = 0
  let elevTotalWeight = 0

  for (const area of terrainAreas) {
    const elev = area.computed_elevation_m
    if (elev == null) continue
    const c = polygonCentroid(area.polygon)
    const dist = euclideanDistance(qx, qy, c.x, c.y)
    const w = dist < 1e-10 ? 1e6 : 1 / (dist * dist)
    elevWeightedSum += elev * w
    elevTotalWeight += w
  }

  const elevation_m = elevTotalWeight > 0 ? elevWeightedSum / elevTotalWeight : 100

  return { scores: clampScores(scores), elevation_m, dominantTerrain }
}

export function computeIDWWithTerrain(
  qx: number,
  qy: number,
  resourcePoints: ResourcePoint[],
  terrainAreas: TerrainArea[],
  pois: PlacedPoI[] = [],
): IDWResult & { terrainBaseScores: ResourceScores } {
  const result = computeIDW(qx, qy, resourcePoints, terrainAreas, pois)
  let dominantTerrainType = result.dominantTerrain
  const base = TERRAIN_BASE_SCORES[dominantTerrainType] ?? ZERO_SCORES

  // Blend terrain base into IDW result (terrain provides floor)
  const blended = addScores(result.scores, {})
  for (const dim of Object.keys(blended) as Array<keyof ResourceScores>) {
    blended[dim] = Math.max(blended[dim], base[dim] * 0.3)
  }

  return {
    ...result,
    scores: clampScores(blended),
    terrainBaseScores: base,
  }
}
