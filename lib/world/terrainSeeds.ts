/**
 * Texture-Aware Terrain Seed Detection
 *
 * Algorithm (no AI — pure image processing):
 *   1. Sample a 15×15 patch around each seed → LAB mean + local texture std dev
 *   2. Score every pixel by: colorDist(LAB) + 0.5 × textureDist(scaled)
 *   3. Threshold → binary match mask
 *   4. Union masks across seeds of the same terrain type
 *   5. Morphological dilation (gap bridging) — radius controlled by gap_bridge setting:
 *        tight=2px  medium=8px  wide=20px  (at 512px resolution)
 *   6. BFS flood from each seed → keep connected region
 *   7. Moore Neighbor boundary trace → RDP simplification → normalised polygon
 *
 * The texture component distinguishes areas with the same average colour but
 * different visual character (e.g. smooth ocean vs. textured forest canopy).
 * The gap bridge merges disconnected matching blobs such as individual tree tops
 * into a single contiguous region.
 */

import sharp from 'sharp'
import { NARROW_TERRAIN_TYPES } from '@/lib/constants/terrain-types'
import { type PixelCache, getPixelCache, setPixelCache } from '@/lib/world/terrainPixelCache'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TerrainSeed {
  terrain_type: string
  x_pct: number
  y_pct: number
  dilation_radius: number
}

export interface DetectedTerrainRegion {
  terrain_type: string
  polygon: Array<{ x: number; y: number }>
  pixelCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GRID_SIZE = 512
const SCORE_THRESHOLD = 18          // ΔE ≈ 18 for normal terrain
const NARROW_SCORE_THRESHOLD = 12   // ΔE ≈ 12 for thin linear features (rivers, coast)
const RIVER_EDGE_STOP = 0.22        // Normalised Sobel magnitude; stops BFS at bank lines (0.22 = strong bank only, not internal river texture)
const MIN_REGION_PIXELS = 40
const MIN_NARROW_REGION_PIXELS = 10  // Rivers can be thin — lower threshold to avoid discarding them
const RDP_EPSILON = 3.0
const PATCH_RADIUS = 4              // 9×9 sample patch
const GX_KERNEL = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
const GY_KERNEL = [-1, -2, -1,  0, 0, 0,  1, 2, 1]

// ─────────────────────────────────────────────────────────────────────────────
// CIELAB colour conversion
// ─────────────────────────────────────────────────────────────────────────────

function toLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)
  const X = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
  const Y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
  const Z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787037 * t + 16 / 116
  return [116 * f(Y) - 16, 500 * (f(X / 0.95047) - f(Y)), 200 * (f(Y) - f(Z / 1.08883))]
}

// ─────────────────────────────────────────────────────────────────────────────
// Sobel edge magnitude map (normalised 0–1)
// ─────────────────────────────────────────────────────────────────────────────

function buildSobelEdgeMap(data: Buffer, width: number, height: number): Float32Array {
  const mags = new Float32Array(width * height)
  let maxMag = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
          const w = (ky + 1) * 3 + (kx + 1)
          gx += GX_KERNEL[w] * lum
          gy += GY_KERNEL[w] * lum
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy)
      mags[y * width + x] = mag
      if (mag > maxMag) maxMag = mag
    }
  }
  if (maxMag > 0) for (let i = 0; i < mags.length; i++) mags[i] /= maxMag
  return mags
}

// ─────────────────────────────────────────────────────────────────────────────
// Local texture: 5×5 luminance standard deviation map
// ─────────────────────────────────────────────────────────────────────────────

function buildStdDevMap(data: Buffer, width: number, height: number): Float32Array {
  const lum = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255
  }
  const stdDev = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, sumSq = 0, n = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            const v = lum[ny * width + nx]; sum += v; sumSq += v * v; n++
          }
        }
      }
      const mean = sum / n
      stdDev[y * width + x] = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
    }
  }
  return stdDev
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed signature: mean LAB + texture std in patch around the clicked pixel
// ─────────────────────────────────────────────────────────────────────────────

interface SeedSignature { meanLab: [number, number, number]; textureStd: number }

function sampleSignature(
  data: Buffer, stdDevMap: Float32Array,
  px: number, py: number, width: number, height: number,
): SeedSignature {
  const labs: Array<[number, number, number]> = []
  const stds: number[] = []
  for (let dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
    for (let dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
      const x = px + dx, y = py + dy
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const i = y * width + x
      labs.push(rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]))
      stds.push(stdDevMap[i])
    }
  }
  const n = labs.length
  return {
    meanLab: [
      labs.reduce((s, l) => s + l[0], 0) / n,
      labs.reduce((s, l) => s + l[1], 0) / n,
      labs.reduce((s, l) => s + l[2], 0) / n,
    ],
    textureStd: stds.reduce((s, v) => s + v, 0) / n,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Match mask: mark pixels whose score < SCORE_THRESHOLD
// ─────────────────────────────────────────────────────────────────────────────

function buildMatchMask(
  data: Buffer, stdDevMap: Float32Array,
  width: number, height: number,
  sig: SeedSignature, seedIdx: number,
  threshold = SCORE_THRESHOLD,
): Uint8Array {
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] < 32) continue
    const [L, A, B] = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
    const dL = L - sig.meanLab[0], dA = A - sig.meanLab[1], dB = B - sig.meanLab[2]
    const colorDist = Math.sqrt(dL * dL + dA * dA + dB * dB)
    const textureDist = Math.abs(stdDevMap[i] - sig.textureStd) * 100
    if (colorDist + 0.5 * textureDist < threshold) mask[i] = 1
  }
  mask[seedIdx] = 1  // always include the seed pixel itself
  return mask
}

// ─────────────────────────────────────────────────────────────────────────────
// Morphological dilation (square kernel)
// ─────────────────────────────────────────────────────────────────────────────

function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      outer: for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && mask[ny * width + nx]) {
            result[y * width + x] = 1; break outer
          }
        }
      }
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// BFS flood from seed pixel through the dilated mask
// ─────────────────────────────────────────────────────────────────────────────

function bfsRegion(
  startX: number, startY: number,
  mask: Uint8Array, width: number, height: number,
  edgeMap?: Float32Array,
  edgeThreshold?: number,
): Uint8Array {
  const visited = new Uint8Array(mask.length)
  const startIdx = startY * width + startX
  visited[startIdx] = 1
  const queue = new Int32Array(mask.length)
  let head = 0, tail = 0
  queue[tail++] = startIdx
  while (head < tail) {
    const idx = queue[head++]
    const x = idx % width
    const y = (idx - x) / width
    const neighbors: number[] = []
    if (x > 0)           neighbors.push(idx - 1)
    if (x < width - 1)   neighbors.push(idx + 1)
    if (y > 0)           neighbors.push(idx - width)
    if (y < height - 1)  neighbors.push(idx + width)
    for (const ni of neighbors) {
      if (visited[ni] || !mask[ni]) continue
      if (edgeMap && edgeThreshold !== undefined && edgeMap[ni] > edgeThreshold) continue
      visited[ni] = 1
      queue[tail++] = ni
    }
  }
  return visited
}

// ─────────────────────────────────────────────────────────────────────────────
// Moore Neighbour boundary trace
// ─────────────────────────────────────────────────────────────────────────────

const MOORE_DX = [1, 1, 0, -1, -1, -1, 0, 1]
const MOORE_DY = [0, 1, 1, 1, 0, -1, -1, -1]

function traceBoundary(
  regionMask: Uint8Array, width: number, height: number, pixelCount: number,
): Array<{ x: number; y: number }> {
  let startX = -1, startY = -1
  outer: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (regionMask[y * width + x]) { startX = x; startY = y; break outer }
    }
  }
  if (startX < 0) return []
  const boundary: Array<{ x: number; y: number }> = []
  let cx = startX, cy = startY, dir = 7
  const MAX_STEPS = pixelCount * 4 + 100
  let steps = 0
  do {
    boundary.push({ x: cx, y: cy })
    const backDir = (dir + 5) % 8
    let found = false
    for (let i = 0; i < 8; i++) {
      const d = (backDir + i) % 8
      const nx = cx + MOORE_DX[d], ny = cy + MOORE_DY[d]
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (regionMask[ny * width + nx]) { dir = d; cx = nx; cy = ny; found = true; break }
    }
    if (!found) break
    steps++
  } while ((cx !== startX || cy !== startY) && steps < MAX_STEPS)
  return boundary
}

// ─────────────────────────────────────────────────────────────────────────────
// Ramer-Douglas-Peucker polygon simplification
// ─────────────────────────────────────────────────────────────────────────────

function perpDist(p: {x:number;y:number}, a: {x:number;y:number}, b: {x:number;y:number}): number {
  const dx = b.x - a.x, dy = b.y - a.y
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy)
}

function rdpSimplify(pts: Array<{x:number;y:number}>, eps: number): Array<{x:number;y:number}> {
  if (pts.length <= 2) return pts
  let maxDist = 0, maxIdx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1])
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > eps) {
    return [
      ...rdpSimplify(pts.slice(0, maxIdx + 1), eps).slice(0, -1),
      ...rdpSimplify(pts.slice(maxIdx), eps),
    ]
  }
  return [pts[0], pts[pts.length - 1]]
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: build pixel cache from image URL
// ─────────────────────────────────────────────────────────────────────────────

export async function buildPixelCache(imageUrl: string): Promise<PixelCache> {
  let buf: Buffer
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.split(',')[1]
    if (!base64) throw new Error('Invalid data URI')
    buf = Buffer.from(base64, 'base64')
  } else {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Failed to fetch map image: ${response.status}`)
    buf = Buffer.from(await response.arrayBuffer())
  }
  const { data, info } = await sharp(buf)
    .resize(GRID_SIZE, GRID_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const stdDevMap = buildStdDevMap(data, info.width, info.height)
  const edgeMap = buildSobelEdgeMap(data, info.width, info.height)
  return { data, width: info.width, height: info.height, stdDevMap, edgeMap }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export async function detectTerrainFromSeeds(
  imageUrl: string,
  seeds: TerrainSeed[],
  mapId?: string,
): Promise<DetectedTerrainRegion[]> {
  let pixelCache: PixelCache | null = mapId ? getPixelCache(mapId) : null
  if (!pixelCache) {
    pixelCache = await buildPixelCache(imageUrl)
    if (mapId) setPixelCache(mapId, pixelCache)
  }
  const { data, width, height, stdDevMap, edgeMap } = pixelCache

  // Group seeds by terrain_type
  const byType = new Map<string, TerrainSeed[]>()
  for (const seed of seeds) {
    if (!byType.has(seed.terrain_type)) byType.set(seed.terrain_type, [])
    byType.get(seed.terrain_type)!.push(seed)
  }

  const results: DetectedTerrainRegion[] = []

  for (const [terrainType, typeSeeds] of byType) {
    const isNarrow = NARROW_TERRAIN_TYPES.has(terrainType)
    const threshold = isNarrow ? NARROW_SCORE_THRESHOLD : SCORE_THRESHOLD

    // Union match masks across all seeds of this type
    const unionMask = new Uint8Array(width * height)
    for (const seed of typeSeeds) {
      const px = Math.round(seed.x_pct * (width - 1))
      const py = Math.round(seed.y_pct * (height - 1))
      const sig = sampleSignature(data, stdDevMap, px, py, width, height)
      const match = buildMatchMask(data, stdDevMap, width, height, sig, py * width + px, threshold)
      for (let i = 0; i < width * height; i++) if (match[i]) unionMask[i] = 1
    }

    // Narrow types use edge-stop BFS (bank lines act as hard boundaries); spread slider is ignored
    const maxDilation = typeSeeds.reduce((max, s) => Math.max(max, s.dilation_radius ?? 0), 0)
    const dilationRadius = isNarrow ? 0 : maxDilation
    const dilated = dilationRadius > 0 ? dilate(unionMask, width, height, dilationRadius) : unionMask

    // BFS from each seed → union regions
    const regionMask = new Uint8Array(width * height)
    for (const seed of typeSeeds) {
      const px = Math.round(seed.x_pct * (width - 1))
      const py = Math.round(seed.y_pct * (height - 1))
      dilated[py * width + px] = 1  // ensure seed is always reachable
      const region = bfsRegion(px, py, dilated, width, height,
        isNarrow ? edgeMap : undefined,
        isNarrow ? RIVER_EDGE_STOP : undefined)
      for (let i = 0; i < width * height; i++) if (region[i]) regionMask[i] = 1
    }

    const pixelCount = regionMask.reduce((s, v) => s + v, 0)
    const minPixels = isNarrow ? MIN_NARROW_REGION_PIXELS : MIN_REGION_PIXELS
    if (pixelCount < minPixels) continue

    const boundary = traceBoundary(regionMask, width, height, pixelCount)
    if (boundary.length < 3) continue
    const simplified = rdpSimplify(boundary, RDP_EPSILON)
    if (simplified.length < 3) continue

    const polygon = simplified.map(p => ({
      x: Math.round((p.x / (width - 1)) * 10000) / 10000,
      y: Math.round((p.y / (height - 1)) * 10000) / 10000,
    }))

    results.push({ terrain_type: terrainType, polygon, pixelCount })
  }

  return results
}
