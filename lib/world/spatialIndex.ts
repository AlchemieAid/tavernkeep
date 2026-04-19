import RBush from 'rbush'

export interface SpatialPoint {
  id: string
  x: number
  y: number
  [key: string]: unknown
}

interface RBushItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  point: SpatialPoint
}

export class SpatialIndex {
  private tree: RBush<RBushItem>

  constructor() {
    this.tree = new RBush<RBushItem>()
  }

  load(points: SpatialPoint[]): void {
    const items: RBushItem[] = points.map(p => ({
      minX: p.x,
      minY: p.y,
      maxX: p.x,
      maxY: p.y,
      point: p,
    }))
    this.tree.load(items)
  }

  insert(point: SpatialPoint): void {
    this.tree.insert({
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
      point,
    })
  }

  queryRadius(cx: number, cy: number, radius: number): SpatialPoint[] {
    const bbox = {
      minX: cx - radius,
      minY: cy - radius,
      maxX: cx + radius,
      maxY: cy + radius,
    }
    const candidates = this.tree.search(bbox)
    return candidates
      .filter(item => {
        const dx = item.point.x - cx
        const dy = item.point.y - cy
        return Math.sqrt(dx * dx + dy * dy) <= radius
      })
      .map(item => item.point)
  }

  queryBBox(minX: number, minY: number, maxX: number, maxY: number): SpatialPoint[] {
    return this.tree
      .search({ minX, minY, maxX, maxY })
      .map(item => item.point)
  }

  clear(): void {
    this.tree.clear()
  }

  get size(): number {
    return this.tree.all().length
  }
}

export function euclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}
