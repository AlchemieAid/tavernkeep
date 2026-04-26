/**
 * Pixel-Based Water Detection
 *
 * Two-pass morphological approach:
 *   Pass 1 (fat water): Erode the water mask by 2px — this removes thin
 *     features like rivers and coast strips, leaving only ocean and lakes.
 *     Rivers connected to ocean become detached in this pass.
 *   Pass 2 (thin water): Pixels in original mask NOT in eroded mask are thin
 *     features — rivers, coast strips. Labeled separately and classified by
 *     aspect ratio and fill ratio.
 *
 *   3. Moore Neighbor boundary tracing (per-component mask)
 *   4. Ramer-Douglas-Peucker polygon simplification
 *
 * Output polygons are normalized to [0, 1] coordinates and match the
 * terrain_areas.polygon JSONB schema: Array<{ x: number; y: number }>
 */

import sharp from 'sharp'
import type { MapGrammar } from '@/lib/prompts/terrainGrammar'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WaterType = 'ocean' | 'lake' | 'river' | 'coast'

export interface NormPoint {
  x: number
  y: number
}

export interface DetectedWaterRegion {
  terrain_type: WaterType
  polygon: NormPoint[]
  pixelCount: number
  intensity: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Color utilities
// ─────────────────────────────────────────────────────────────────────────────

interface HSL {
  h: number // 0–360
  s: number // 0–1
  l: number // 0–1
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: h * 360, s, l }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

/**
 * Returns the dominant water-hue ranges to use for this map.
 * Parses grammar dominant_palette to find blue/teal swatches; falls back to defaults.
 */
function getWaterHueRanges(grammar?: MapGrammar): Array<{ min: number; max: number }> {
  const DEFAULT_RANGES = [
    { min: 165, max: 255 }, // blue → cyan → teal range
  ]

  if (!grammar?.dominant_palette?.length) return DEFAULT_RANGES

  const waterRanges: Array<{ min: number; max: number }> = []
  for (const hex of grammar.dominant_palette) {
    const rgb = hexToRgb(hex)
    if (!rgb) continue
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
    // Palette swatch looks like water: blue/teal hue, not too dark, not greyed out
    if (h >= 160 && h <= 260 && s > 0.15 && l > 0.1 && l < 0.85) {
      waterRanges.push({ min: Math.max(0, h - 20), max: Math.min(360, h + 20) })
    }
  }

  return waterRanges.length > 0 ? waterRanges : DEFAULT_RANGES
}

/**
 * Returns true if the pixel (r,g,b) matches the water color profile.
 * alpha < 32 pixels (transparent) are always excluded.
 */
function isWaterPixel(
  r: number, g: number, b: number, a: number,
  hueRanges: Array<{ min: number; max: number }>,
): boolean {
  if (a < 32) return false
  const { h, s, l } = rgbToHsl(r, g, b)
  // Exclude near-black, near-white, and very unsaturated (grey)
  if (s < 0.12 || l < 0.05 || l > 0.92) return false
  return hueRanges.some(range => h >= range.min && h <= range.max)
}

// ─────────────────────────────────────────────────────────────────────────────
// Morphological erosion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Box erosion: a pixel survives only if ALL pixels within `radius` in every
 * direction are also water. This shrinks water regions by `radius` pixels on
 * every side, effectively disconnecting thin features (rivers) from fat bodies.
 */
function erode(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue
      let all = true
      outer: for (let dy = -radius; dy <= radius && all; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx; const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || !mask[ny * width + nx]) {
            all = false; break outer
          }
        }
      }
      if (all) result[y * width + x] = 1
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Image decoding
// ─────────────────────────────────────────────────────────────────────────────

const GRID_SIZE = 256 // process at this resolution for speed

interface PixelGrid {
  data: Buffer
  width: number
  height: number
}

async function fetchImagePixels(imageUrl: string): Promise<PixelGrid> {
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)

  const { data, info } = await sharp(inputBuffer)
    .resize(GRID_SIZE, GRID_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return { data, width: info.width, height: info.height }
}

// ─────────────────────────────────────────────────────────────────────────────
// Union-Find connected component labeling
// ─────────────────────────────────────────────────────────────────────────────

class UnionFind {
  private parent: Int32Array
  private rank: Uint8Array

  constructor(size: number) {
    this.parent = new Int32Array(size).map((_, i) => i)
    this.rank = new Uint8Array(size)
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }

  union(a: number, b: number): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra === rb) return
    if (this.rank[ra] < this.rank[rb]) { this.parent[ra] = rb; return }
    if (this.rank[ra] > this.rank[rb]) { this.parent[rb] = ra; return }
    this.parent[rb] = ra
    this.rank[ra]++
  }
}

interface Component {
  label: number
  pixels: Array<{ x: number; y: number }>
  minX: number; maxX: number
  minY: number; maxY: number
  touchesEdge: boolean
}

function labelComponents(
  waterMask: Uint8Array,
  width: number,
  height: number,
): Map<number, Component> {
  const uf = new UnionFind(width * height)

  // Connect water pixels to 4-neighbors
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (!waterMask[idx]) continue
      if (x + 1 < width && waterMask[idx + 1]) uf.union(idx, idx + 1)
      if (y + 1 < height && waterMask[idx + width]) uf.union(idx, idx + width)
    }
  }

  // Collect components
  const components = new Map<number, Component>()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (!waterMask[idx]) continue
      const root = uf.find(idx)
      if (!components.has(root)) {
        components.set(root, {
          label: root,
          pixels: [],
          minX: x, maxX: x,
          minY: y, maxY: y,
          touchesEdge: false,
        })
      }
      const comp = components.get(root)!
      comp.pixels.push({ x, y })
      if (x < comp.minX) comp.minX = x
      if (x > comp.maxX) comp.maxX = x
      if (y < comp.minY) comp.minY = y
      if (y > comp.maxY) comp.maxY = y
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        comp.touchesEdge = true
      }
    }
  }

  return components
}

// ─────────────────────────────────────────────────────────────────────────────
// Component classification
// ─────────────────────────────────────────────────────────────────────────────

const MIN_FAT_PIXEL_COUNT = 30  // minimum for ocean/lake components (post-erosion)
const MIN_THIN_PIXEL_COUNT = 12 // minimum for river/coast components (pre-erosion only)
const MAX_COMPONENTS = 50

/** Build a binary mask containing only this component's pixels. */
function buildCompMask(
  comp: Component,
  totalSize: number,
  width: number,
): Uint8Array {
  const mask = new Uint8Array(totalSize)
  for (const p of comp.pixels) mask[p.y * width + p.x] = 1
  return mask
}

/** Classify a fat (post-erosion) component as ocean or lake. */
function classifyFatComponent(
  comp: Component,
  oceanLabel: number | null,
): WaterType | null {
  if (comp.pixels.length < MIN_FAT_PIXEL_COUNT) return null
  if (comp.label === oceanLabel) return 'ocean'
  // Any remaining fat isolated component is a lake
  return 'lake'
}

/**
 * Classify a thin component (pixels that eroded away) as river or coast.
 * Fill ratio = pixels / bbox_area — low fill ratio means the shape meanders
 * rather than being a compact blob, which is the signature of a river.
 */
function classifyThinComponent(comp: Component): WaterType | null {
  if (comp.pixels.length < MIN_THIN_PIXEL_COUNT) return null

  const bboxW = comp.maxX - comp.minX + 1
  const bboxH = comp.maxY - comp.minY + 1
  const bboxArea = bboxW * bboxH
  const fillRatio = comp.pixels.length / bboxArea
  const aspectRatio = Math.max(bboxW, bboxH) / Math.max(1, Math.min(bboxW, bboxH))
  const shortAxis = Math.min(bboxW, bboxH)

  // River: either elongated bbox (meanders along one axis) OR low fill ratio
  // (meandering river fills much less of its bounding box than a solid blob).
  // Low-fill is the key discriminator — a classic S-curve river covers <30% of its bbox.
  if (fillRatio < 0.35 && comp.pixels.length >= MIN_THIN_PIXEL_COUNT) return 'river'
  if (aspectRatio >= 2.5 && shortAxis <= GRID_SIZE * 0.08) return 'river'

  // Coast: thin strip touching the edge
  if (comp.touchesEdge && shortAxis <= GRID_SIZE * 0.07) return 'coast'

  // Default for thin features above minimum size
  if (comp.pixels.length >= MIN_THIN_PIXEL_COUNT * 2) return 'river'

  return null
}

function findOceanLabel(components: Map<number, Component>): number | null {
  let ocean: Component | null = null
  for (const comp of components.values()) {
    if (!comp.touchesEdge) continue
    if (!ocean || comp.pixels.length > ocean.pixels.length) ocean = comp
  }
  return ocean?.label ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Moore Neighbor boundary tracing (Jacob's stopping criterion)
// ─────────────────────────────────────────────────────────────────────────────

// 8-directional Moore neighborhood, clockwise from right
const MOORE_DX = [1, 1, 0, -1, -1, -1,  0,  1]
const MOORE_DY = [0, 1, 1,  1,  0, -1, -1, -1]

function traceBoundary(
  comp: Component,
  waterMask: Uint8Array,
  width: number,
  height: number,
): Array<{ x: number; y: number }> {
  // Find topmost-leftmost pixel (guaranteed boundary)
  let startX = comp.pixels[0].x
  let startY = comp.pixels[0].y
  for (const p of comp.pixels) {
    if (p.y < startY || (p.y === startY && p.x < startX)) {
      startX = p.x; startY = p.y
    }
  }

  const boundary: Array<{ x: number; y: number }> = []
  let cx = startX; let cy = startY
  let dir = 7 // approach from upper-left (direction 7 = top-left)
  const MAX_STEPS = comp.pixels.length * 4 + 100
  let steps = 0

  do {
    boundary.push({ x: cx, y: cy })
    // Search clockwise from (dir + 6) % 8 (backtrack start)
    const backDir = (dir + 5) % 8
    let found = false
    for (let i = 0; i < 8; i++) {
      const checkDir = (backDir + i) % 8
      const nx = cx + MOORE_DX[checkDir]
      const ny = cy + MOORE_DY[checkDir]
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (waterMask[ny * width + nx]) {
        dir = checkDir
        cx = nx; cy = ny
        found = true
        break
      }
    }
    if (!found) break
    steps++
  } while ((cx !== startX || cy !== startY) && steps < MAX_STEPS)

  return boundary
}

// ─────────────────────────────────────────────────────────────────────────────
// Ramer-Douglas-Peucker simplification
// ─────────────────────────────────────────────────────────────────────────────

function perpendicularDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y)
  }
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy)
}

function rdpSimplify(
  points: Array<{ x: number; y: number }>,
  epsilon: number,
): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIdx = 0
  const last = points.length - 1

  for (let i = 1; i < last; i++) {
    const d = perpendicularDistance(points[i], points[0], points[last])
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon)
    const right = rdpSimplify(points.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [points[0], points[last]]
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes the map image and returns pixel-accurate water terrain regions.
 *
 * Two-pass morphological approach:
 *   Fat pass  — eroded mask → ocean + lakes (thin features removed by erosion)
 *   Thin pass — original XOR eroded → rivers + coasts (thin features only)
 */
export async function detectWaterRegions(
  imageUrl: string,
  grammar?: MapGrammar,
): Promise<DetectedWaterRegion[]> {
  const { data, width, height } = await fetchImagePixels(imageUrl)
  const hueRanges = getWaterHueRanges(grammar)
  const totalSize = width * height
  const RDP_EPSILON = 2.0

  // ── Step 1: Build full water mask ──────────────────────────────────────────
  const waterMask = new Uint8Array(totalSize)
  for (let i = 0; i < totalSize; i++) {
    const r = data[i * 4]; const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]; const a = data[i * 4 + 3]
    if (isWaterPixel(r, g, b, a, hueRanges)) waterMask[i] = 1
  }

  const totalWater = waterMask.reduce((s, v) => s + v, 0)
  if (totalWater < MIN_THIN_PIXEL_COUNT) return []

  // ── Step 2: Erode by 2px → fat water only (rivers disappear) ─────────────
  const erodedMask = erode(waterMask, width, height, 2)

  // ── Step 3: Thin water = original minus eroded (rivers & coast strips) ────
  const thinMask = new Uint8Array(totalSize)
  for (let i = 0; i < totalSize; i++) {
    if (waterMask[i] && !erodedMask[i]) thinMask[i] = 1
  }

  const results: DetectedWaterRegion[] = []

  function processComponent(
    comp: Component,
    waterType: WaterType,
  ): void {
    const compMask = buildCompMask(comp, totalSize, width)
    const rawBoundary = traceBoundary(comp, compMask, width, height)
    if (rawBoundary.length < 3) return
    const simplified = rdpSimplify(rawBoundary, RDP_EPSILON)
    if (simplified.length < 3) return
    const polygon: NormPoint[] = simplified.map(p => ({
      x: Math.round((p.x / (width - 1)) * 10000) / 10000,
      y: Math.round((p.y / (height - 1)) * 10000) / 10000,
    }))
    const intensity =
      waterType === 'ocean' ? 1.0
      : waterType === 'river' ? 0.95
      : waterType === 'lake' ? 0.90
      : 0.75
    results.push({ terrain_type: waterType, polygon, pixelCount: comp.pixels.length, intensity })
  }

  // ── Step 4: Fat components → ocean and lakes ──────────────────────────────
  const fatComponents = labelComponents(erodedMask, width, height)
  const oceanLabel = findOceanLabel(fatComponents)

  Array.from(fatComponents.values())
    .sort((a, b) => b.pixels.length - a.pixels.length)
    .slice(0, MAX_COMPONENTS)
    .forEach(comp => {
      const wt = classifyFatComponent(comp, oceanLabel)
      if (wt) processComponent(comp, wt)
    })

  // ── Step 5: Thin components → rivers and coasts ───────────────────────────
  const thinComponents = labelComponents(thinMask, width, height)

  Array.from(thinComponents.values())
    .sort((a, b) => b.pixels.length - a.pixels.length)
    .slice(0, MAX_COMPONENTS)
    .forEach(comp => {
      const wt = classifyThinComponent(comp)
      if (wt) processComponent(comp, wt)
    })

  return results
}
