import { describe, it, expect } from 'vitest'
import { computeTravelTime, formatTravelTime } from '../../lib/world/travelTime'

describe('travelTime', () => {
  it('returns impassable for water terrain', () => {
    const r = computeTravelTime(50, 'ocean', 0)
    expect(r.impassable).toBe(true)
    expect(r.days.foot).toBeNull()
  })

  it('returns impassable for mountain pass in winter when pass is closed', () => {
    const r = computeTravelTime(20, 'mountains', 0, {
      isMountainPass: true, season: 'winter', passOpenMonths: 5,
    })
    expect(r.impassable).toBe(true)
  })

  it('plains travel is faster than jungle travel same distance', () => {
    const plains = computeTravelTime(100, 'plains', 0)
    const jungle = computeTravelTime(100, 'jungle', 0)
    expect(plains.days.foot!).toBeLessThan(jungle.days.foot!)
  })

  it('road bonus reduces travel time', () => {
    const noRoad = computeTravelTime(100, 'plains', 0, { hasRoad: false })
    const road   = computeTravelTime(100, 'plains', 0, { hasRoad: true  })
    expect(road.days.foot!).toBeLessThan(noRoad.days.foot!)
  })

  it('mounted is always faster than foot on traversable terrain', () => {
    const r = computeTravelTime(100, 'plains', 0)
    expect(r.days.mounted!).toBeLessThan(r.days.foot!)
  })

  it('elevation penalty slows travel', () => {
    const flat  = computeTravelTime(50, 'mountains', 0)
    const climb = computeTravelTime(50, 'mountains', 1000)
    expect(climb.days.foot!).toBeGreaterThan(flat.days.foot!)
  })

  it('spring swamp applies seasonal slowdown', () => {
    const normal = computeTravelTime(50, 'swamp', 0, { season: 'autumn' })
    const spring = computeTravelTime(50, 'swamp', 0, { season: 'spring' })
    expect(spring.days.foot!).toBeGreaterThan(normal.days.foot!)
  })

  it('formatTravelTime returns impassable reason for water', () => {
    const r = computeTravelTime(50, 'lake', 0)
    const s = formatTravelTime(r)
    expect(s).toMatch(/impassable|water/i)
  })

  it('formatTravelTime returns day string for valid route', () => {
    const r = computeTravelTime(30, 'plains', 0)
    const s = formatTravelTime(r)
    expect(s).toMatch(/d foot/)
  })

  it('all days values are positive for passable terrain', () => {
    const r = computeTravelTime(50, 'plains', 0)
    expect(r.impassable).toBe(false)
    expect(r.days.foot!).toBeGreaterThan(0)
    expect(r.days.mounted!).toBeGreaterThan(0)
    expect(r.days.cart!).toBeGreaterThan(0)
  })
})
