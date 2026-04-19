import { describe, it, expect, beforeEach } from 'vitest'
import { SpatialIndex, euclideanDistance } from '../../lib/world/spatialIndex'

describe('spatialIndex', () => {
  describe('euclideanDistance', () => {
    it('returns 0 for identical points', () => {
      expect(euclideanDistance(0.5, 0.5, 0.5, 0.5)).toBe(0)
    })

    it('returns correct distance for known points', () => {
      expect(euclideanDistance(0, 0, 3, 4)).toBe(5)
    })

    it('is symmetric', () => {
      const d1 = euclideanDistance(0.1, 0.2, 0.8, 0.9)
      const d2 = euclideanDistance(0.8, 0.9, 0.1, 0.2)
      expect(d1).toBeCloseTo(d2)
    })
  })

  describe('SpatialIndex', () => {
    let index: SpatialIndex

    beforeEach(() => {
      index = new SpatialIndex()
    })

    it('starts empty', () => {
      expect(index.size).toBe(0)
    })

    it('loads points and reports correct size', () => {
      index.load([
        { id: 'a', x: 0.1, y: 0.1 },
        { id: 'b', x: 0.5, y: 0.5 },
        { id: 'c', x: 0.9, y: 0.9 },
      ])
      expect(index.size).toBe(3)
    })

    it('inserts a single point', () => {
      index.insert({ id: 'x', x: 0.3, y: 0.3 })
      expect(index.size).toBe(1)
    })

    it('queryRadius returns points within radius', () => {
      index.load([
        { id: 'near',  x: 0.52, y: 0.52 },
        { id: 'far',   x: 0.90, y: 0.90 },
        { id: 'exact', x: 0.50, y: 0.50 },
      ])
      const results = index.queryRadius(0.5, 0.5, 0.05)
      const ids = results.map(r => r.id)
      expect(ids).toContain('exact')
      expect(ids).toContain('near')
      expect(ids).not.toContain('far')
    })

    it('queryRadius returns nothing when all points are outside radius', () => {
      index.load([
        { id: 'far1', x: 0.9, y: 0.9 },
        { id: 'far2', x: 0.8, y: 0.8 },
      ])
      const results = index.queryRadius(0.1, 0.1, 0.05)
      expect(results).toHaveLength(0)
    })

    it('queryBBox returns all points inside bounding box', () => {
      index.load([
        { id: 'inside',  x: 0.3, y: 0.3 },
        { id: 'outside', x: 0.8, y: 0.8 },
        { id: 'edge',    x: 0.5, y: 0.5 },
      ])
      const results = index.queryBBox(0.2, 0.2, 0.5, 0.5)
      const ids = results.map(r => r.id)
      expect(ids).toContain('inside')
      expect(ids).toContain('edge')
      expect(ids).not.toContain('outside')
    })

    it('clear resets the index', () => {
      index.load([{ id: 'a', x: 0.1, y: 0.1 }])
      index.clear()
      expect(index.size).toBe(0)
    })

    it('handles 350 points and queryRadius stays fast', () => {
      const points = Array.from({ length: 350 }, (_, i) => ({
        id: `p${i}`,
        x: (i % 20) / 20,
        y: Math.floor(i / 20) / 20,
      }))
      index.load(points)
      const start = performance.now()
      index.queryRadius(0.5, 0.5, 0.1)
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(1)
    })
  })
})
