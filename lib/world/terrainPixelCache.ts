/**
 * Shared in-process pixel cache for terrain seed detection.
 *
 * The image download + Sharp decode + stdDev map computation takes ~400–600ms.
 * By caching the result the first time a painter opens, every subsequent
 * seed click returns fills in <50ms (just the scoring + BFS).
 *
 * Cache lifetime: 20 minutes.  Entries are evicted lazily on next write.
 * On Vercel, the warm-instance window easily covers a full editing session.
 */

export interface PixelCache {
  data: Buffer
  width: number
  height: number
  stdDevMap: Float32Array
  edgeMap: Float32Array
}

interface CacheEntry {
  cache: PixelCache
  createdAt: number
}

const CACHE_TTL_MS = 20 * 60 * 1000
const store = new Map<string, CacheEntry>()

export function getPixelCache(mapId: string): PixelCache | null {
  const entry = store.get(mapId)
  if (!entry) return null
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    store.delete(mapId)
    return null
  }
  return entry.cache
}

export function setPixelCache(mapId: string, cache: PixelCache): void {
  for (const [id, entry] of store) {
    if (Date.now() - entry.createdAt > CACHE_TTL_MS) store.delete(id)
  }
  store.set(mapId, { cache, createdAt: Date.now() })
}
