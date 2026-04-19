import { describe, it, expect } from 'vitest'
import { computeVisibility } from '../../lib/world/visibility'

describe('visibility', () => {
  it('returns Panoramic for high mountain elevation', () => {
    const r = computeVisibility(3000, 'mountains')
    expect(r.label).toBe('Panoramic > 50km')
  })

  it('returns Enclosed for deep forest at sea level', () => {
    const r = computeVisibility(0, 'deep_forest')
    expect(r.label).toBe('Enclosed < 1km')
  })

  it('watchtower bonus increases range by 50%', () => {
    const without = computeVisibility(200, 'plains')
    const with_wt = computeVisibility(200, 'plains', true)
    expect(with_wt.range_km).toBeCloseTo(without.range_km * 1.5, 1)
  })

  it('plains has better visibility than forest at same elevation', () => {
    const plains = computeVisibility(200, 'plains')
    const forest = computeVisibility(200, 'forest')
    expect(plains.range_km).toBeGreaterThan(forest.range_km)
  })

  it('zero elevation returns zero range', () => {
    const r = computeVisibility(0, 'plains')
    expect(r.range_km).toBe(0)
  })

  it('range_km increases with elevation', () => {
    const low  = computeVisibility(100,  'plains')
    const high = computeVisibility(1000, 'plains')
    expect(high.range_km).toBeGreaterThan(low.range_km)
  })

  it('uses earth horizon formula: ~3.57 * sqrt(elev)', () => {
    const r = computeVisibility(100, 'plains')
    const expected = 3.57 * Math.sqrt(100)
    expect(r.range_km).toBeCloseTo(expected, 0)
  })
})
