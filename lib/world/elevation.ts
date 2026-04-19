export interface ElevationRange {
  min: number
  max: number
}

export const TERRAIN_ELEVATION_RANGES: Record<string, ElevationRange> = {
  ocean:          { min: 0,    max: 0    },
  deep_sea:       { min: 0,    max: 0    },
  coast:          { min: 0,    max: 15   },
  river:          { min: 5,    max: 120  },
  lake:           { min: 2,    max: 300  },
  plains:         { min: 50,   max: 500  },
  grassland:      { min: 100,  max: 700  },
  farmland:       { min: 10,   max: 350  },
  forest:         { min: 50,   max: 1500 },
  deep_forest:    { min: 100,  max: 1200 },
  jungle:         { min: 0,    max: 800  },
  hills:          { min: 200,  max: 800  },
  highlands:      { min: 600,  max: 1500 },
  mountains:      { min: 800,  max: 3500 },
  high_mountains: { min: 2500, max: 6000 },
  swamp:          { min: 0,    max: 50   },
  wetlands:       { min: 0,    max: 80   },
  desert:         { min: 100,  max: 1500 },
  badlands:       { min: 200,  max: 1200 },
  tundra:         { min: 0,    max: 500  },
  arctic:         { min: 0,    max: 2000 },
  volcanic:       { min: 500,  max: 3500 },
}

export function terrainMidpointElevation(terrainType: string): number {
  const range = TERRAIN_ELEVATION_RANGES[terrainType]
  if (!range) return 100
  return (range.min + range.max) / 2
}

export function elevationLabel(m: number): string {
  if (m < 10)   return 'Sea level'
  if (m < 200)  return 'Lowlands'
  if (m < 500)  return 'Uplands'
  if (m < 1000) return 'Highlands'
  if (m < 2000) return 'Alpine'
  if (m < 3500) return 'Subalpine'
  return 'High alpine peak'
}
