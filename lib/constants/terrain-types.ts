export type GapBridge = 'tight' | 'medium' | 'wide'

export interface TerrainTypeDefinition {
  value: string
  label: string
  color: string
  defaultGapBridge: GapBridge
  group: string
}

export const TERRAIN_TYPES: TerrainTypeDefinition[] = [
  // Water
  { value: 'ocean',          label: 'Ocean',          color: '#1565C0', defaultGapBridge: 'tight',  group: 'Water' },
  { value: 'river',          label: 'River',          color: '#1E88E5', defaultGapBridge: 'tight',  group: 'Water' },
  { value: 'lake',           label: 'Lake',           color: '#039BE5', defaultGapBridge: 'medium', group: 'Water' },
  { value: 'coast',          label: 'Coast',          color: '#26C6DA', defaultGapBridge: 'tight',  group: 'Water' },
  // Land
  { value: 'plains',         label: 'Plains',         color: '#8BC34A', defaultGapBridge: 'medium', group: 'Land' },
  { value: 'grassland',      label: 'Grassland',      color: '#43A047', defaultGapBridge: 'medium', group: 'Land' },
  { value: 'farmland',       label: 'Farmland',       color: '#F9A825', defaultGapBridge: 'medium', group: 'Land' },
  // Elevation
  { value: 'hills',          label: 'Hills',          color: '#8D6E63', defaultGapBridge: 'medium', group: 'Elevation' },
  { value: 'mountains',      label: 'Mountains',      color: '#78909C', defaultGapBridge: 'medium', group: 'Elevation' },
  { value: 'high_mountains', label: 'High Mountains', color: '#B0BEC5', defaultGapBridge: 'medium', group: 'Elevation' },
  // Vegetation
  { value: 'forest',         label: 'Forest',         color: '#2E7D32', defaultGapBridge: 'wide',   group: 'Vegetation' },
  { value: 'jungle',         label: 'Jungle',         color: '#558B2F', defaultGapBridge: 'wide',   group: 'Vegetation' },
  { value: 'swamp',          label: 'Swamp',          color: '#5D4037', defaultGapBridge: 'medium', group: 'Vegetation' },
  // Special
  { value: 'desert',         label: 'Desert',         color: '#FFA726', defaultGapBridge: 'medium', group: 'Special' },
  { value: 'tundra',         label: 'Tundra',         color: '#B0BEC5', defaultGapBridge: 'medium', group: 'Special' },
  { value: 'badlands',       label: 'Badlands',       color: '#BF360C', defaultGapBridge: 'medium', group: 'Special' },
  { value: 'volcanic',       label: 'Volcanic',       color: '#E53935', defaultGapBridge: 'medium', group: 'Special' },
  { value: 'arctic',         label: 'Arctic',         color: '#90CAF9', defaultGapBridge: 'medium', group: 'Special' },
]

export const TERRAIN_TYPE_MAP: Record<string, TerrainTypeDefinition> = Object.fromEntries(
  TERRAIN_TYPES.map(t => [t.value, t])
)

export const TERRAIN_GROUPS: string[] = ['Water', 'Land', 'Elevation', 'Vegetation', 'Special']
