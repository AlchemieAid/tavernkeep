export interface TerrainTypeDefinition {
  value: string
  label: string
  color: string
  defaultDilation: number
  group: string
}

export const TERRAIN_TYPES: TerrainTypeDefinition[] = [
  // Water
  { value: 'ocean',          label: 'Ocean',          color: '#1565C0', defaultDilation: 2,  group: 'Water' },
  { value: 'river',          label: 'River',          color: '#1E88E5', defaultDilation: 0,  group: 'Water' },
  { value: 'lake',           label: 'Lake',           color: '#039BE5', defaultDilation: 3,  group: 'Water' },
  { value: 'coast',          label: 'Coast',          color: '#26C6DA', defaultDilation: 0,  group: 'Water' },
  // Land
  { value: 'plains',         label: 'Plains',         color: '#8BC34A', defaultDilation: 3,  group: 'Land' },
  { value: 'grassland',      label: 'Grassland',      color: '#43A047', defaultDilation: 3,  group: 'Land' },
  { value: 'farmland',       label: 'Farmland',       color: '#F9A825', defaultDilation: 2,  group: 'Land' },
  // Elevation
  { value: 'hills',          label: 'Hills',          color: '#8D6E63', defaultDilation: 2,  group: 'Elevation' },
  { value: 'mountains',      label: 'Mountains',      color: '#78909C', defaultDilation: 2,  group: 'Elevation' },
  { value: 'high_mountains', label: 'High Mountains', color: '#B0BEC5', defaultDilation: 1,  group: 'Elevation' },
  // Vegetation
  { value: 'forest',         label: 'Forest',         color: '#2E7D32', defaultDilation: 6,  group: 'Vegetation' },
  { value: 'jungle',         label: 'Jungle',         color: '#558B2F', defaultDilation: 6,  group: 'Vegetation' },
  { value: 'swamp',          label: 'Swamp',          color: '#5D4037', defaultDilation: 4,  group: 'Vegetation' },
  // Special
  { value: 'desert',         label: 'Desert',         color: '#FFA726', defaultDilation: 3,  group: 'Special' },
  { value: 'tundra',         label: 'Tundra',         color: '#B0BEC5', defaultDilation: 3,  group: 'Special' },
  { value: 'badlands',       label: 'Badlands',       color: '#BF360C', defaultDilation: 2,  group: 'Special' },
  { value: 'volcanic',       label: 'Volcanic',       color: '#E53935', defaultDilation: 2,  group: 'Special' },
  { value: 'arctic',         label: 'Arctic',         color: '#90CAF9', defaultDilation: 2,  group: 'Special' },
  // Settlement
  { value: 'city',           label: 'City',           color: '#FF8F00', defaultDilation: 1,  group: 'Settlement' },
  { value: 'town',           label: 'Town',           color: '#FFB300', defaultDilation: 1,  group: 'Settlement' },
  { value: 'ruins',          label: 'Ruins',          color: '#A1887F', defaultDilation: 1,  group: 'Settlement' },
]

export const TERRAIN_TYPE_MAP: Record<string, TerrainTypeDefinition> = Object.fromEntries(
  TERRAIN_TYPES.map(t => [t.value, t])
)

export const TERRAIN_GROUPS: string[] = ['Water', 'Land', 'Elevation', 'Vegetation', 'Special', 'Settlement']

/** Types that represent thin linear features — use stricter thresholds and zero dilation */
export const NARROW_TERRAIN_TYPES = new Set(['river', 'stream', 'coast'])
