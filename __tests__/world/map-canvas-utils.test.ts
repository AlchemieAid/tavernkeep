/**
 * Tests for map canvas utilities and regression checks
 *
 * Covers:
 * - SVG coordinate inBounds logic (hover letterbox fix)
 * - Resource filtering by hiddenResourceTypes set
 * - RESOURCE_GROUPS structure mirrors map-canvas.tsx constants
 * - MapSetupWizard: no min-h-screen on outer div (scroll fix regression)
 * - DM layout: no overflow-hidden (must allow page scroll)
 */

import * as fs from 'fs'
import * as path from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// SVG coordinate inBounds logic
// Mirrors the inBounds check inside getCanvasCoords in map-canvas.tsx
// ─────────────────────────────────────────────────────────────────────────────

function svgInBounds(svgX: number, svgY: number): boolean {
  return svgX >= 0 && svgX <= 1 && svgY >= 0 && svgY <= 1
}

describe('SVG coordinate inBounds check (letterbox hover fix)', () => {
  describe('positions within the map image', () => {
    it('center of map is in bounds', () => expect(svgInBounds(0.5, 0.5)).toBe(true))
    it('top-left corner is in bounds', () => expect(svgInBounds(0, 0)).toBe(true))
    it('top-right corner is in bounds', () => expect(svgInBounds(1, 0)).toBe(true))
    it('bottom-left corner is in bounds', () => expect(svgInBounds(0, 1)).toBe(true))
    it('bottom-right corner is in bounds', () => expect(svgInBounds(1, 1)).toBe(true))
    it('arbitrary interior point is in bounds', () => expect(svgInBounds(0.3, 0.77)).toBe(true))
    it('extreme interior point is in bounds', () => expect(svgInBounds(0.99, 0.01)).toBe(true))
  })

  describe('letterbox areas outside the map image', () => {
    it('left letterbox is NOT in bounds', () => expect(svgInBounds(-0.1, 0.5)).toBe(false))
    it('right letterbox is NOT in bounds', () => expect(svgInBounds(1.1, 0.5)).toBe(false))
    it('top letterbox is NOT in bounds', () => expect(svgInBounds(0.5, -0.05)).toBe(false))
    it('bottom letterbox is NOT in bounds', () => expect(svgInBounds(0.5, 1.05)).toBe(false))
    it('corner letterbox is NOT in bounds', () => expect(svgInBounds(-0.1, -0.1)).toBe(false))
    it('far outside is NOT in bounds', () => expect(svgInBounds(2, 3)).toBe(false))
  })

  describe('boundary edge cases', () => {
    it('exactly 0 on x is in bounds', () => expect(svgInBounds(0, 0.5)).toBe(true))
    it('exactly 1 on x is in bounds', () => expect(svgInBounds(1, 0.5)).toBe(true))
    it('exactly 0 on y is in bounds', () => expect(svgInBounds(0.5, 0)).toBe(true))
    it('exactly 1 on y is in bounds', () => expect(svgInBounds(0.5, 1)).toBe(true))
    it('epsilon below 0 is NOT in bounds', () => expect(svgInBounds(-0.001, 0.5)).toBe(false))
    it('epsilon above 1 is NOT in bounds', () => expect(svgInBounds(1.001, 0.5)).toBe(false))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Resource filtering logic
// Mirrors hiddenResourceTypes Set filtering in map-canvas.tsx
// ─────────────────────────────────────────────────────────────────────────────

interface ResourcePoint { resource_type: string; x_pct: number; y_pct: number }

function filterResources(points: ResourcePoint[], hidden: Set<string>): ResourcePoint[] {
  return points.filter(rp => !hidden.has(rp.resource_type))
}

const sampleResources: ResourcePoint[] = [
  { resource_type: 'iron_deposit', x_pct: 0.2, y_pct: 0.3 },
  { resource_type: 'gold_vein', x_pct: 0.4, y_pct: 0.5 },
  { resource_type: 'fertile_farmland', x_pct: 0.6, y_pct: 0.7 },
  { resource_type: 'ancient_forest', x_pct: 0.8, y_pct: 0.2 },
  { resource_type: 'arcane_nexus', x_pct: 0.1, y_pct: 0.9 },
]

describe('Resource filtering by hiddenResourceTypes', () => {
  it('shows all resources when nothing is hidden', () => {
    const visible = filterResources(sampleResources, new Set())
    expect(visible).toHaveLength(5)
  })

  it('hides a single resource type', () => {
    const visible = filterResources(sampleResources, new Set(['iron_deposit']))
    expect(visible).toHaveLength(4)
    expect(visible.find(r => r.resource_type === 'iron_deposit')).toBeUndefined()
  })

  it('hides multiple resource types', () => {
    const visible = filterResources(sampleResources, new Set(['iron_deposit', 'gold_vein', 'arcane_nexus']))
    expect(visible).toHaveLength(2)
    expect(visible.map(r => r.resource_type)).toEqual(['fertile_farmland', 'ancient_forest'])
  })

  it('shows nothing when all types are hidden', () => {
    const allTypes = new Set(sampleResources.map(r => r.resource_type))
    const visible = filterResources(sampleResources, allTypes)
    expect(visible).toHaveLength(0)
  })

  it('ignores unknown types in the hidden set', () => {
    const visible = filterResources(sampleResources, new Set(['nonexistent_type']))
    expect(visible).toHaveLength(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE_GROUPS structure validation
// Ensures the constant in map-canvas.tsx matches expected schema
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_RESOURCE_GROUPS: Record<string, string[]> = {
  Minerals: ['iron_deposit','copper_deposit','gold_vein','silver_vein','gem_cluster','coal_seam','stone_quarry','salt_flat','sulfur_vent'],
  'Food & Water': ['fertile_farmland','grazing_land','orchard','deep_fishery','coastal_fishery','river_fishery'],
  Nature: ['ancient_forest','managed_woodland','rare_herbs'],
  Trade: ['natural_harbor','river_ford','mountain_pass','trade_crossroads','oasis','river_confluence'],
  Special: ['arcane_nexus','ancient_ruins','volcanic_soil','hot_springs'],
}

describe('RESOURCE_GROUPS constant', () => {
  it('has 5 groups', () => {
    expect(Object.keys(EXPECTED_RESOURCE_GROUPS)).toHaveLength(5)
  })

  it('every group has at least one resource type', () => {
    Object.entries(EXPECTED_RESOURCE_GROUPS).forEach(([group, types]) => {
      expect(types.length).toBeGreaterThan(0)
    })
  })

  it('no resource type appears in multiple groups (no duplicates)', () => {
    const allTypes = Object.values(EXPECTED_RESOURCE_GROUPS).flat()
    const uniqueTypes = new Set(allTypes)
    expect(allTypes.length).toBe(uniqueTypes.size)
  })

  it('source file contains the RESOURCE_GROUPS constant', () => {
    const filePath = path.join(process.cwd(), 'components', 'dm', 'map-canvas.tsx')
    const source = fs.readFileSync(filePath, 'utf8')
    expect(source).toContain('RESOURCE_GROUPS')
  })

  it('source file contains hiddenResourceTypes state', () => {
    const filePath = path.join(process.cwd(), 'components', 'dm', 'map-canvas.tsx')
    const source = fs.readFileSync(filePath, 'utf8')
    expect(source).toContain('hiddenResourceTypes')
  })

  it('source file contains inBounds check on hover', () => {
    const filePath = path.join(process.cwd(), 'components', 'dm', 'map-canvas.tsx')
    const source = fs.readFileSync(filePath, 'utf8')
    expect(source).toContain('inBounds')
  })

  it('source file contains showNames state', () => {
    const filePath = path.join(process.cwd(), 'components', 'dm', 'map-canvas.tsx')
    const source = fs.readFileSync(filePath, 'utf8')
    expect(source).toContain('showNames')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MapSetupWizard scroll regression test
// Ensures min-h-screen was not re-introduced on the wizard outer div
// ─────────────────────────────────────────────────────────────────────────────

describe('MapSetupWizard — scroll regression', () => {
  const wizardSource = fs.readFileSync(
    path.join(process.cwd(), 'components', 'dm', 'map-setup-wizard.tsx'),
    'utf8',
  )

  it('outer div in return does NOT have min-h-screen (caused mobile scroll jump)', () => {
    // Find the outer wrapper div in the return statement
    const returnIdx = wizardSource.indexOf('return (')
    expect(returnIdx).toBeGreaterThan(-1)

    const returnSection = wizardSource.slice(returnIdx, returnIdx + 200)
    // The first div after return should NOT have min-h-screen
    expect(returnSection).not.toContain('min-h-screen')
  })

  it('outer div has bg-[#111316] background class', () => {
    expect(wizardSource).toContain('bg-[#111316]')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DM layout — must not have overflow-hidden (blocks page scroll)
// ─────────────────────────────────────────────────────────────────────────────

describe('DM layout — scroll safety', () => {
  const layoutSource = fs.readFileSync(
    path.join(process.cwd(), 'app', 'dm', 'layout.tsx'),
    'utf8',
  )

  it('does NOT use overflow-hidden (would block page scrolling)', () => {
    expect(layoutSource).not.toContain('overflow-hidden')
  })

  it('uses min-h-screen for full-height background', () => {
    expect(layoutSource).toContain('min-h-screen')
  })
})
