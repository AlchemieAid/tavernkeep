/**
 * Pixel-Based Water Detection
 *
 * Distance transform approach (v3):
 *   Each water pixel receives d = Chebyshev distance to nearest non-water pixel.
 *   d ≤ RIVER_HALF_WIDTH → thin feature (river, coast strip).
 *   d > RIVER_HALF_WIDTH → fat feature (ocean, lake).
 *   This correctly splits a river from the ocean at the narrow junction even when
 *   they are part of the same connected component — no global erosion needed.
 *   Ocean fat component → dilated to build coast zone → thin near coast = coastline.
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
 * Two-pass Chebyshev distance transform (Rosenfeld-Pfaltz).
 * Returns a map where each water pixel holds its distance to the nearest
 * non-water pixel (capped at `cap` for efficiency). Non-water pixels = 0.
 *
 * Chebyshev distance treats 8-connected neighbors as equidistant (no diagonal
 * penalty), which is correct for raster water-width measurement.
 */
function chebyshevDistanceTransform(
  mask: Uint8Array,
  width: number,
  height: number,
  cap: number,
): Uint8Array {
  const init = Math.min(cap + 1, 255)
  const dist = new Uint8Array(mask.length)
  for (let i = 0; i < mask.length; i++) dist[i] = mask[i] ? init : 0

  // Pass 1: top-left → bottom-right
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!mask[i]) continue
      if (y > 0 && x > 0)           dist[i] = Math.min(dist[i], dist[(y-1)*width+(x-1)] + 1)
      if (y > 0)                    dist[i] = Math.min(dist[i], dist[(y-1)*width+x] + 1)
      if (y > 0 && x < width - 1)  dist[i] = Math.min(dist[i], dist[(y-1)*width+(x+1)] + 1)
      if (x > 0)                    dist[i] = Math.min(dist[i], dist[y*width+(x-1)] + 1)
    }
  }

  // Pass 2: bottom-right → top-left
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x
      if (!mask[i]) continue
      if (y < height-1 && x < width-1) dist[i] = Math.min(dist[i], dist[(y+1)*width+(x+1)] + 1)
      if (y < height-1)                dist[i] = Math.min(dist[i], dist[(y+1)*width+x] + 1)
      if (y < height-1 && x > 0)      dist[i] = Math.min(dist[i], dist[(y+1)*width+(x-1)] + 1)
      if (x < width-1)                 dist[i] = Math.min(dist[i], dist[y*width+(x+1)] + 1)
      if (dist[i] > cap) dist[i] = cap
    }
  }

  return dist
}

/**
 * Box dilation: a pixel is set if ANY pixel within `radius` is set in the source.
 * Used to expand the fat ocean mask outward to build the "coast zone" — any thin
 * water component overlapping this zone is a coastline, not a river.
 */
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      outer: for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx; const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && mask[ny * width + nx]) {
            result[y * width + x] = 1
            break outer
          }
        }
      }
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Image decoding
// ─────────────────────────────────────────────────────────────────────────────

const GRID_SIZE = 512 // 512px — enough resolution to distinguish thin rivers from ocean

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

const RIVER_HALF_WIDTH = 5      // water pixels with depth ≤ this are "thin" (river/coast)
const MIN_FAT_PIXEL_COUNT = 60  // minimum for ocean/lake components (512px)
const MIN_THIN_PIXEL_COUNT = 15 // minimum for river/coast components (512px)
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

/** Returns true if any pixel in `comp` is set in `zoneMask`. */
function anyPixelInMask(comp: Component, zoneMask: Uint8Array, width: number): boolean {
  for (const p of comp.pixels) {
    if (zoneMask[p.y * width + p.x]) return true
  }
  return false
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
 *
 * Coast zone priority: if the component overlaps the dilated ocean mask, it is a
 * coastline strip — NOT a river. This correctly handles the ocean-edge pixels that
 * were stripped by erosion.
 *
 * River: remaining thin components that are elongated or have low fill ratio.
 * Fill ratio = pixels / bbox_area; a meandering river covers <40% of its bbox.
 */
function classifyThinComponent(
  comp: Component,
  coastZoneMask: Uint8Array,
  width: number,
): WaterType | null {
  if (comp.pixels.length < MIN_THIN_PIXEL_COUNT) return null

  // Coast zone check — must happen FIRST before any river heuristics
  if (anyPixelInMask(comp, coastZoneMask, width)) return 'coast'

  const bboxW = comp.maxX - comp.minX + 1
  const bboxH = comp.maxY - comp.minY + 1
  const bboxArea = bboxW * bboxH
  const fillRatio = comp.pixels.length / bboxArea
  const aspectRatio = Math.max(bboxW, bboxH) / Math.max(1, Math.min(bboxW, bboxH))
  const shortAxis = Math.min(bboxW, bboxH)

  // River: low fill ratio (meandering) OR elongated + thin
  if (fillRatio < 0.40) return 'river'
  if (aspectRatio >= 2.5 && shortAxis <= GRID_SIZE * 0.08) return 'river'

  // Larger thin blobs that passed coast check but aren't rivers — skip
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
 *   Fat pass  — pixels with Chebyshev depth > RIVER_HALF_WIDTH → ocean + lakes
 *   Thin pass — pixels with depth ≤ RIVER_HALF_WIDTH → rivers + coasts
 */
export async function detectWaterRegions(
  imageUrl: string,
  grammar?: MapGrammar,
): Promise<DetectedWaterRegion[]> {
  const { data, width, height } = await fetchImagePixels(imageUrl)
  const hueRanges = getWaterHueRanges(grammar)
  const totalSize = width * height
  const RDP_EPSILON = 3.0 // scaled for 512px

  // ── Step 1: Build full water mask ──────────────────────────────────────────
  const waterMask = new Uint8Array(totalSize)
  for (let i = 0; i < totalSize; i++) {
    const r = data[i * 4]; const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]; const a = data[i * 4 + 3]
    if (isWaterPixel(r, g, b, a, hueRanges)) waterMask[i] = 1
  }

  const totalWater = waterMask.reduce((s, v) => s + v, 0)
  if (totalWater < MIN_THIN_PIXEL_COUNT) return []

  // ── Step 2: Distance transform → each water pixel gets its depth (half-width) ──
  // d ≤ RIVER_HALF_WIDTH → thin (river/coast);  d > RIVER_HALF_WIDTH → fat (ocean/lake)
  const distMap = chebyshevDistanceTransform(waterMask, width, height, RIVER_HALF_WIDTH + 1)

  // ── Step 3: Split into fat and thin masks using depth threshold ──────────────
  const fatMask = new Uint8Array(totalSize)
  const thinMask = new Uint8Array(totalSize)
  for (let i = 0; i < totalSize; i++) {
    if (!waterMask[i]) continue
    if (distMap[i] > RIVER_HALF_WIDTH) fatMask[i] = 1
    else thinMask[i] = 1
  }

  const results: DetectedWaterRegion[] = []

  function processComponent(comp: Component, waterType: WaterType): void {
    const compMask = buildCompMask(comp, totalSize, width)
    const rawBoundary = traceBoundary(comp, compMask, width, height)
    if (rawBoundary.length < 3) return
    const simplified = rdpSimplify(rawBoundary, RDP_EPSILON)
    if (simplified.length < 3) return
    const polygon: NormPoint[] = simplified.map(p => ({
      x: Math.round((p.x / (width - 1)) * 10000) / 10000,
      y: Math.round((p.y / (height - 1)) * 10000) / 10000,
    }))
    const intensity = waterType === 'river' ? 0.95 : waterType === 'lake' ? 0.90 : 0.75
    results.push({ terrain_type: waterType, polygon, pixelCount: comp.pixels.length, intensity })
  }

  // ── Step 4: Fat components → identify ocean (coast zone anchor) + store lakes ──
  const fatComponents = labelComponents(fatMask, width, height)
  const oceanLabel = findOceanLabel(fatComponents)

  // Build coast zone: dilate the fat ocean component outward by RIVER_HALF_WIDTH so
  // thin-pass pixels just outside the fat ocean are classified as coast, not river.
  let coastZoneMask: Uint8Array = new Uint8Array(totalSize)
  const fatSorted = Array.from(fatComponents.values())
    .sort((a, b) => b.pixels.length - a.pixels.length)
    .slice(0, MAX_COMPONENTS)

  for (const comp of fatSorted) {
    const wt = classifyFatComponent(comp, oceanLabel)
    if (!wt) continue
    if (wt === 'ocean') {
      // Dilate the fat ocean to build coast zone (recover the thin boundary pixels)
      const oceanMask = buildCompMask(comp, totalSize, width)
      coastZoneMask = dilate(oceanMask, width, height, RIVER_HALF_WIDTH)
      // Ocean itself: do NOT store a polygon (map background already shows it)
    } else {
      processComponent(comp, wt)
    }
  }

  // ── Step 5: Thin components → coast (if in coast zone) or river ────────────
  const thinComponents = labelComponents(thinMask, width, height)

  Array.from(thinComponents.values())
    .sort((a, b) => b.pixels.length - a.pixels.length)
    .slice(0, MAX_COMPONENTS)
    .forEach(comp => {
      const wt = classifyThinComponent(comp, coastZoneMask, width)
      if (wt) processComponent(comp, wt)
    })

  return results
}
