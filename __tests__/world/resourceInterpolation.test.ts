import { describe, it, expect } from 'vitest'
import {
  computeIDW,
  buildPoISyntheticNodes,
  type ResourcePoint,
  type TerrainArea,
  type PlacedPoI,
} from '../../lib/world/resourceInterpolation'

// ── Fixtures ────────────────────────────────────────────────────────────────

const PLAINS_TERRAIN: TerrainArea[] = [{
  id: 't1',
  terrain_type: 'plains',
  polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
  computed_elevation_m: 200,
}]

const IRON_POINT: ResourcePoint = {
  id: 'iron1',
  x_pct: 0.5,
  y_pct: 0.5,
  resource_type: 'iron_deposit',
  richness: 0.8,
  influence_radius_pct: 0.15,
}

const FARMLAND_POINT: ResourcePoint = {
  id: 'farm1',
  x_pct: 0.5,
  y_pct: 0.5,
  resource_type: 'fertile_farmland',
  richness: 1.0,
  influence_radius_pct: 0.20,
}

const HARBOR_POINT: ResourcePoint = {
  id: 'harbor1',
  x_pct: 0.3,
  y_pct: 0.3,
  resource_type: 'natural_harbor',
  richness: 0.9,
  influence_radius_pct: 0.12,
}

// ── IDW Core ─────────────────────────────────────────────────────────────────

describe('computeIDW', () => {
  describe('terrain fallback', () => {
    it('falls back to terrain base scores when no resource points are in range', () => {
      const result = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN)
      expect(result.scores.agriculture).toBeGreaterThan(0.4)
      expect(result.dominantTerrain).toBe('plains')
    })

    it('scores are clamped to [0, 1]', () => {
      const result = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN)
      for (const val of Object.values(result.scores)) {
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('resource point interpolation', () => {
    it('raises mining score when query is at an iron deposit', () => {
      const result = computeIDW(0.5, 0.5, [IRON_POINT], PLAINS_TERRAIN)
      expect(result.scores.mining).toBeGreaterThan(0.5)
    })

    it('raises agriculture score when query is at fertile farmland', () => {
      const result = computeIDW(0.5, 0.5, [FARMLAND_POINT], PLAINS_TERRAIN)
      expect(result.scores.agriculture).toBeGreaterThan(0.7)
    })

    it('raises trade_access for natural_harbor', () => {
      const result = computeIDW(0.3, 0.3, [HARBOR_POINT], PLAINS_TERRAIN)
      expect(result.scores.trade_access).toBeGreaterThan(0.5)
    })

    it('returns lower values when query is far outside influence radius', () => {
      const near  = computeIDW(0.5,  0.5, [IRON_POINT], PLAINS_TERRAIN)
      const far   = computeIDW(0.95, 0.95, [IRON_POINT], PLAINS_TERRAIN)
      expect(near.scores.mining).toBeGreaterThan(far.scores.mining)
    })

    it('IDW is distance-weighted: closer = stronger signal', () => {
      const veryClose = computeIDW(0.50, 0.50, [IRON_POINT], PLAINS_TERRAIN)
      const moderate  = computeIDW(0.57, 0.57, [IRON_POINT], PLAINS_TERRAIN)
      expect(veryClose.scores.mining).toBeGreaterThanOrEqual(moderate.scores.mining)
    })

    it('combines multiple resource types additively via IDW', () => {
      const combined = computeIDW(0.5, 0.5, [IRON_POINT, FARMLAND_POINT], PLAINS_TERRAIN)
      const ironOnly = computeIDW(0.5, 0.5, [IRON_POINT], PLAINS_TERRAIN)
      // agriculture should be higher with farmland added
      expect(combined.scores.agriculture).toBeGreaterThan(ironOnly.scores.agriculture)
    })
  })

  describe('elevation computation', () => {
    it('interpolates elevation from terrain area centroids', () => {
      const result = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN)
      expect(result.elevation_m).toBeCloseTo(200, 0)
    })

    it('returns a positive elevation for mountain terrain', () => {
      const mountainTerrain: TerrainArea[] = [{
        id: 'm1',
        terrain_type: 'mountains',
        polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        computed_elevation_m: 2000,
      }]
      const result = computeIDW(0.5, 0.5, [], mountainTerrain)
      expect(result.elevation_m).toBeGreaterThan(500)
    })

    it('defaults to 100m when no elevation data exists', () => {
      const noElev: TerrainArea[] = [{
        id: 'x',
        terrain_type: 'plains',
        polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        computed_elevation_m: null,
      }]
      const result = computeIDW(0.5, 0.5, [], noElev)
      expect(result.elevation_m).toBe(100)
    })
  })

  describe('out-of-range points are ignored', () => {
    it('ignores resource points outside influence radius and falls back to terrain', () => {
      const farPoint: ResourcePoint = {
        ...IRON_POINT,
        x_pct: 0.0,
        y_pct: 0.0,
        influence_radius_pct: 0.05,
      }
      const result = computeIDW(0.9, 0.9, [farPoint], PLAINS_TERRAIN)
      // Should fall back to terrain base scores (plains agriculture ~0.6)
      expect(result.scores.agriculture).toBeGreaterThan(0.3)
      expect(result.dominantTerrain).toBe('plains')
    })
  })
})

// ── PoI Economic Modifier Injection ─────────────────────────────────────────

describe('PoI economic modifier injection', () => {
  describe('buildPoISyntheticNodes', () => {
    it('returns empty array for PoI with no modifiers', () => {
      const pois: PlacedPoI[] = [{ id: 'p1', x_pct: 0.5, y_pct: 0.5, poi_type: 'wandering_hermit_undefined_type' }]
      const nodes = buildPoISyntheticNodes(pois)
      expect(nodes).toHaveLength(0)
    })

    it('creates a synthetic node for bridge (trade_access modifier)', () => {
      const pois: PlacedPoI[] = [{ id: 'p2', x_pct: 0.5, y_pct: 0.5, poi_type: 'bridge' }]
      const nodes = buildPoISyntheticNodes(pois)
      expect(nodes).toHaveLength(1)
      expect(nodes[0].dimensions.trade_access).toBeGreaterThan(0)
    })

    it('creates a synthetic node for aqueduct (water_access + agriculture)', () => {
      const pois: PlacedPoI[] = [{ id: 'p3', x_pct: 0.4, y_pct: 0.4, poi_type: 'aqueduct' }]
      const nodes = buildPoISyntheticNodes(pois)
      expect(nodes).toHaveLength(1)
      expect(nodes[0].dimensions.water_access).toBeGreaterThan(0)
      expect(nodes[0].dimensions.agriculture).toBeGreaterThan(0)
    })

    it('uses fixed influence radius of 0.05', () => {
      const pois: PlacedPoI[] = [{ id: 'p4', x_pct: 0.5, y_pct: 0.5, poi_type: 'crossroads' }]
      const nodes = buildPoISyntheticNodes(pois)
      expect(nodes[0].influence_radius).toBe(0.05)
    })

    it('handles multiple PoIs in one call', () => {
      const pois: PlacedPoI[] = [
        { id: 'p5', x_pct: 0.3, y_pct: 0.3, poi_type: 'bridge' },
        { id: 'p6', x_pct: 0.7, y_pct: 0.7, poi_type: 'mill'   },
        { id: 'p7', x_pct: 0.5, y_pct: 0.5, poi_type: 'nomad_camp' }, // no modifiers
      ]
      const nodes = buildPoISyntheticNodes(pois)
      expect(nodes).toHaveLength(2)
    })
  })

  describe('PoI modifiers affect IDW scores', () => {
    it('bridge PoI raises trade_access at nearby query point', () => {
      const bridgePoi: PlacedPoI = { id: 'poi_bridge', x_pct: 0.5, y_pct: 0.5, poi_type: 'bridge' }

      const withBridge    = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [bridgePoi])
      const withoutBridge = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [])

      expect(withBridge.scores.trade_access).toBeGreaterThan(withoutBridge.scores.trade_access)
    })

    it('aqueduct PoI raises water_access at nearby query point', () => {
      const aquePoi: PlacedPoI = { id: 'poi_aq', x_pct: 0.5, y_pct: 0.5, poi_type: 'aqueduct' }

      const with_aq    = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [aquePoi])
      const without_aq = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [])

      expect(with_aq.scores.water_access).toBeGreaterThan(without_aq.scores.water_access)
    })

    it('arcane_nexus PoI raises wealth and multiple dimensions', () => {
      const nexusPoi: PlacedPoI = { id: 'poi_nx', x_pct: 0.5, y_pct: 0.5, poi_type: 'arcane_nexus' }

      const with_nx    = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [nexusPoi])
      const without_nx = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [])

      expect(with_nx.scores.wealth).toBeGreaterThan(without_nx.scores.wealth)
      expect(with_nx.scores.agriculture).toBeGreaterThan(without_nx.scores.agriculture)
    })

    it('PoI effect falls off with distance — no influence beyond 0.05', () => {
      const bridgePoi: PlacedPoI = { id: 'poi_far_bridge', x_pct: 0.0, y_pct: 0.0, poi_type: 'bridge' }

      // Query 0.1 units away — outside the 0.05 radius
      const far    = computeIDW(0.1, 0.1, [], PLAINS_TERRAIN, [bridgePoi])
      const noPoI  = computeIDW(0.1, 0.1, [], PLAINS_TERRAIN, [])

      expect(far.scores.trade_access).toBeCloseTo(noPoI.scores.trade_access, 5)
    })

    it('portal PoI (trade_access: 0.3) gives strongest trade bonus', () => {
      const portalPoi: PlacedPoI  = { id: 'poi_portal',  x_pct: 0.5, y_pct: 0.5, poi_type: 'portal'  }
      const waystationPoi: PlacedPoI = { id: 'poi_ws', x_pct: 0.5, y_pct: 0.5, poi_type: 'waystation' }

      const withPortal    = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [portalPoi])
      const withWaystation = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [waystationPoi])

      expect(withPortal.scores.trade_access).toBeGreaterThan(withWaystation.scores.trade_access)
    })

    it('multiple PoIs stack their modifiers', () => {
      const pois: PlacedPoI[] = [
        { id: 'poi_b1', x_pct: 0.5, y_pct: 0.5, poi_type: 'bridge'  },
        { id: 'poi_b2', x_pct: 0.5, y_pct: 0.5, poi_type: 'crossroads' },
      ]

      const twoPoIs = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, pois)
      const onePoI  = computeIDW(0.5, 0.5, [], PLAINS_TERRAIN, [pois[0]])

      expect(twoPoIs.scores.trade_access).toBeGreaterThanOrEqual(onePoI.scores.trade_access)
    })

    it('PoI modifiers + resource points combine correctly', () => {
      const bridgePoi: PlacedPoI = { id: 'poi_b', x_pct: 0.5, y_pct: 0.5, poi_type: 'bridge' }

      const resourceOnly = computeIDW(0.5, 0.5, [IRON_POINT], PLAINS_TERRAIN, [])
      const combined     = computeIDW(0.5, 0.5, [IRON_POINT], PLAINS_TERRAIN, [bridgePoi])

      // mining stays strong from iron deposit
      expect(combined.scores.mining).toBeGreaterThan(0.4)
      // trade_access improves from bridge
      expect(combined.scores.trade_access).toBeGreaterThan(resourceOnly.scores.trade_access)
    })

    it('tollgate has negative trade_access modifier', () => {
      const tollgate: PlacedPoI  = { id: 'poi_toll', x_pct: 0.5, y_pct: 0.5, poi_type: 'tollgate' }
      const nodes = buildPoISyntheticNodes([tollgate])
      expect(nodes[0].dimensions.trade_access).toBeLessThan(0)
    })
  })
})
