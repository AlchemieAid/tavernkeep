export interface ResourceScores {
  agriculture:  number
  fishing:      number
  forestry:     number
  mining:       number
  trade_access: number
  water_access: number
  wealth:       number
}

export type TerrainType =
  | 'ocean' | 'deep_sea' | 'coast' | 'river' | 'lake'
  | 'plains' | 'grassland' | 'farmland'
  | 'forest' | 'deep_forest' | 'jungle'
  | 'hills' | 'highlands' | 'mountains' | 'high_mountains'
  | 'swamp' | 'wetlands' | 'desert' | 'badlands'
  | 'tundra' | 'arctic' | 'volcanic'

export const TERRAIN_BASE_SCORES: Record<string, ResourceScores> = {
  ocean:          { agriculture: 0.00, fishing: 0.20, forestry: 0.00, mining: 0.00, trade_access: 0.40, water_access: 0.60, wealth: 0.10 },
  deep_sea:       { agriculture: 0.00, fishing: 0.10, forestry: 0.00, mining: 0.00, trade_access: 0.20, water_access: 0.50, wealth: 0.05 },
  coast:          { agriculture: 0.20, fishing: 0.70, forestry: 0.10, mining: 0.10, trade_access: 0.60, water_access: 0.70, wealth: 0.30 },
  river:          { agriculture: 0.40, fishing: 0.60, forestry: 0.10, mining: 0.10, trade_access: 0.50, water_access: 0.90, wealth: 0.25 },
  lake:           { agriculture: 0.30, fishing: 0.50, forestry: 0.05, mining: 0.05, trade_access: 0.30, water_access: 0.80, wealth: 0.20 },
  plains:         { agriculture: 0.60, fishing: 0.05, forestry: 0.05, mining: 0.10, trade_access: 0.50, water_access: 0.20, wealth: 0.30 },
  grassland:      { agriculture: 0.50, fishing: 0.05, forestry: 0.10, mining: 0.05, trade_access: 0.40, water_access: 0.20, wealth: 0.25 },
  farmland:       { agriculture: 0.90, fishing: 0.05, forestry: 0.05, mining: 0.05, trade_access: 0.30, water_access: 0.30, wealth: 0.35 },
  forest:         { agriculture: 0.20, fishing: 0.10, forestry: 0.70, mining: 0.15, trade_access: 0.20, water_access: 0.30, wealth: 0.20 },
  deep_forest:    { agriculture: 0.10, fishing: 0.05, forestry: 0.90, mining: 0.10, trade_access: 0.10, water_access: 0.25, wealth: 0.15 },
  jungle:         { agriculture: 0.15, fishing: 0.15, forestry: 0.80, mining: 0.10, trade_access: 0.10, water_access: 0.50, wealth: 0.15 },
  hills:          { agriculture: 0.30, fishing: 0.05, forestry: 0.30, mining: 0.50, trade_access: 0.30, water_access: 0.20, wealth: 0.25 },
  highlands:      { agriculture: 0.20, fishing: 0.10, forestry: 0.20, mining: 0.60, trade_access: 0.20, water_access: 0.25, wealth: 0.20 },
  mountains:      { agriculture: 0.10, fishing: 0.05, forestry: 0.15, mining: 0.80, trade_access: 0.15, water_access: 0.20, wealth: 0.20 },
  high_mountains: { agriculture: 0.05, fishing: 0.00, forestry: 0.05, mining: 0.70, trade_access: 0.05, water_access: 0.10, wealth: 0.15 },
  swamp:          { agriculture: 0.10, fishing: 0.30, forestry: 0.20, mining: 0.05, trade_access: 0.05, water_access: 0.60, wealth: 0.05 },
  wetlands:       { agriculture: 0.15, fishing: 0.40, forestry: 0.15, mining: 0.05, trade_access: 0.10, water_access: 0.70, wealth: 0.10 },
  desert:         { agriculture: 0.05, fishing: 0.00, forestry: 0.00, mining: 0.20, trade_access: 0.20, water_access: 0.05, wealth: 0.10 },
  badlands:       { agriculture: 0.05, fishing: 0.00, forestry: 0.00, mining: 0.30, trade_access: 0.10, water_access: 0.05, wealth: 0.10 },
  tundra:         { agriculture: 0.05, fishing: 0.15, forestry: 0.05, mining: 0.15, trade_access: 0.10, water_access: 0.15, wealth: 0.05 },
  arctic:         { agriculture: 0.00, fishing: 0.10, forestry: 0.00, mining: 0.10, trade_access: 0.05, water_access: 0.20, wealth: 0.05 },
  volcanic:       { agriculture: 0.15, fishing: 0.00, forestry: 0.00, mining: 0.40, trade_access: 0.05, water_access: 0.05, wealth: 0.10 },
}

export const ZERO_SCORES: ResourceScores = {
  agriculture: 0, fishing: 0, forestry: 0, mining: 0,
  trade_access: 0, water_access: 0, wealth: 0,
}

export function clampScore(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function clampScores(scores: ResourceScores): ResourceScores {
  return {
    agriculture:  clampScore(scores.agriculture),
    fishing:      clampScore(scores.fishing),
    forestry:     clampScore(scores.forestry),
    mining:       clampScore(scores.mining),
    trade_access: clampScore(scores.trade_access),
    water_access: clampScore(scores.water_access),
    wealth:       clampScore(scores.wealth),
  }
}

export function addScores(a: ResourceScores, b: Partial<ResourceScores>): ResourceScores {
  return {
    agriculture:  (a.agriculture  + (b.agriculture  ?? 0)),
    fishing:      (a.fishing      + (b.fishing      ?? 0)),
    forestry:     (a.forestry     + (b.forestry     ?? 0)),
    mining:       (a.mining       + (b.mining       ?? 0)),
    trade_access: (a.trade_access + (b.trade_access ?? 0)),
    water_access: (a.water_access + (b.water_access ?? 0)),
    wealth:       (a.wealth       + (b.wealth       ?? 0)),
  }
}

export const RESOURCE_DIMENSIONS: Record<string, Partial<ResourceScores>> = {
  // ── Extraction ────────────────────────────────────────────────────────────
  iron_deposit:    { mining: 1.0 },
  copper_deposit:  { mining: 0.8 },
  gold_vein:       { mining: 0.6, wealth: 0.8 },
  silver_vein:     { mining: 0.6, wealth: 0.6 },
  gem_cluster:     { mining: 0.4, wealth: 1.0 },
  coal_seam:       { mining: 0.9 },
  stone_quarry:    { mining: 0.7 },
  salt_flat:       { mining: 0.5, trade_access: 0.3 },
  sulfur_vent:     { mining: 0.3 },
  // ── Biological ───────────────────────────────────────────────────────────
  deep_fishery:    { fishing: 1.0 },
  coastal_fishery: { fishing: 0.9, water_access: 0.3 },
  river_fishery:   { fishing: 0.8, water_access: 0.5 },
  fertile_farmland:{ agriculture: 1.0 },
  grazing_land:    { agriculture: 0.7 },
  orchard:         { agriculture: 0.8 },
  ancient_forest:  { forestry: 1.0 },
  managed_woodland:{ forestry: 0.8 },
  rare_herbs:      { forestry: 0.4, wealth: 0.4 },
  // ── Trade ────────────────────────────────────────────────────────────────
  natural_harbor:  { trade_access: 1.0, fishing: 0.3 },
  river_ford:      { trade_access: 0.7 },
  mountain_pass:   { trade_access: 0.8 },
  trade_crossroads:{ trade_access: 0.9 },
  oasis:           { water_access: 1.0, agriculture: 0.5, trade_access: 0.4 },
  river_confluence:{ water_access: 0.8, trade_access: 0.5, fishing: 0.5 },
  // ── Special ──────────────────────────────────────────────────────────────
  arcane_nexus:    { wealth: 0.8 },
  ancient_ruins:   { wealth: 0.3, trade_access: 0.1 },
  volcanic_soil:   { agriculture: 0.9 },
  hot_springs:     { water_access: 0.5, wealth: 0.3, trade_access: 0.2 },
}
