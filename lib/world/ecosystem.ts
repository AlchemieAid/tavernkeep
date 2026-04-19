import type { ClimateZone } from './climate'

export type ForagingYield = 'none' | 'poor' | 'moderate' | 'rich'
export type EncounterType = 'wilderness' | 'civilized' | 'dangerous' | 'desolate'

export interface EcosystemData {
  flora: string[]
  fauna: string[]
  foraging_yield: ForagingYield
  encounter_type: EncounterType
}

interface EcosystemInput {
  terrain_type: string
  climate_zone: ClimateZone
  elevation_m: number
}

type EcosystemKey = string

const ECOSYSTEM_TABLE: Partial<Record<EcosystemKey, EcosystemData>> = {
  // terrain::climate
  'forest::temperate_maritime': {
    flora: ['oak', 'elm', 'hawthorn', 'wild garlic', 'foxglove', 'fever-leaf'],
    fauna: ['deer', 'wild boar', 'red fox', 'brown bear', 'wolves', 'wood pigeons'],
    foraging_yield: 'rich', encounter_type: 'wilderness',
  },
  'forest::temperate_continental': {
    flora: ['pine', 'birch', 'fern', 'mushroom', 'burdock'],
    fauna: ['deer', 'elk', 'lynx', 'wolves', 'owls'],
    foraging_yield: 'moderate', encounter_type: 'wilderness',
  },
  'deep_forest::temperate_maritime': {
    flora: ['ancient oak', 'moss carpet', 'rare ferns', 'nightshade'],
    fauna: ['brown bear', 'wolves', 'wild boar', 'giant spiders', 'owlbears'],
    foraging_yield: 'moderate', encounter_type: 'dangerous',
  },
  'jungle::tropical': {
    flora: ['strangler fig', 'orchid', 'giant fern', 'poisonvine', 'breadfruit'],
    fauna: ['jaguar', 'serpents', 'giant beetles', 'parrots', 'monkeys'],
    foraging_yield: 'rich', encounter_type: 'dangerous',
  },
  'plains::temperate_continental': {
    flora: ['wheatgrass', 'clover', 'dandelion', 'wild barley'],
    fauna: ['deer', 'rabbits', 'hawks', 'field mice', 'bison'],
    foraging_yield: 'moderate', encounter_type: 'civilized',
  },
  'grassland::temperate_maritime': {
    flora: ['ryegrass', 'clover', 'thistle', 'heather'],
    fauna: ['sheep', 'rabbits', 'foxes', 'buzzards'],
    foraging_yield: 'moderate', encounter_type: 'civilized',
  },
  'desert::arid': {
    flora: ['scrub brush', 'desert sage', 'ghost orchid', 'barrel cactus'],
    fauna: ['scorpions', 'desert vipers', 'vultures', 'dust cats', 'basilisks'],
    foraging_yield: 'poor', encounter_type: 'dangerous',
  },
  'mountains::highland': {
    flora: ['alpine moss', 'snow edelweiss', 'ice lichen', 'mountain heather'],
    fauna: ['mountain goat', 'snow leopard', 'eagles', 'frost wolves', 'griffins'],
    foraging_yield: 'none', encounter_type: 'desolate',
  },
  'high_mountains::highland': {
    flora: ['alpine moss', 'snow edelweiss', 'ice lichen'],
    fauna: ['mountain goat', 'snow leopard', 'eagles', 'frost wolves'],
    foraging_yield: 'none', encounter_type: 'desolate',
  },
  'swamp::temperate_maritime': {
    flora: ['cattail', 'water lily', 'swamp cypress', 'bloodmoss'],
    fauna: ['frogs', 'snakes', 'crocodilians', 'giant leeches', 'will-o-wisps'],
    foraging_yield: 'poor', encounter_type: 'dangerous',
  },
  'coast::temperate_maritime': {
    flora: ['sea grass', 'kelp', 'sea lavender', 'rock samphire'],
    fauna: ['seabirds', 'seals', 'crabs', 'dolphins'],
    foraging_yield: 'moderate', encounter_type: 'civilized',
  },
  'tundra::subarctic': {
    flora: ['lichen', 'arctic moss', 'permafrost sedge', 'dwarf willow'],
    fauna: ['reindeer', 'arctic fox', 'snowy owls', 'polar bears', 'mammoths'],
    foraging_yield: 'poor', encounter_type: 'desolate',
  },
  'arctic::arctic': {
    flora: ['ice algae', 'frost lichen'],
    fauna: ['polar bears', 'walrus', 'arctic wolves', 'frost giants'],
    foraging_yield: 'none', encounter_type: 'desolate',
  },
  'volcanic::arid': {
    flora: ['sulfur fern', 'volcanic orchid', 'obsidian moss'],
    fauna: ['fire salamanders', 'magma crawlers', 'ash ravens'],
    foraging_yield: 'none', encounter_type: 'dangerous',
  },
  'hills::temperate_continental': {
    flora: ['heather', 'bilberry', 'bracken fern', 'wild thyme'],
    fauna: ['deer', 'red fox', 'badgers', 'kestrels', 'cave bears'],
    foraging_yield: 'moderate', encounter_type: 'wilderness',
  },
  'farmland::temperate_maritime': {
    flora: ['wheat', 'barley', 'rye', 'clover', 'turnips'],
    fauna: ['rabbits', 'field mice', 'crows', 'sparrows'],
    foraging_yield: 'rich', encounter_type: 'civilized',
  },
  'river::temperate_maritime': {
    flora: ['willow', 'reed', 'water mint', 'bulrush'],
    fauna: ['otters', 'herons', 'pike', 'kingfisher', 'river crabs'],
    foraging_yield: 'moderate', encounter_type: 'civilized',
  },
}

const FALLBACK_ECOSYSTEMS: Partial<Record<string, EcosystemData>> = {
  forest:         { flora: ['oak', 'pine', 'fern', 'mushroom'], fauna: ['deer', 'wolves', 'foxes'], foraging_yield: 'moderate', encounter_type: 'wilderness' },
  plains:         { flora: ['grass', 'wildflower', 'clover'], fauna: ['deer', 'rabbits', 'hawks'], foraging_yield: 'moderate', encounter_type: 'civilized' },
  mountains:      { flora: ['alpine moss', 'lichen'], fauna: ['mountain goat', 'eagles'], foraging_yield: 'poor', encounter_type: 'desolate' },
  desert:         { flora: ['cactus', 'dry shrub'], fauna: ['scorpions', 'lizards'], foraging_yield: 'poor', encounter_type: 'dangerous' },
  swamp:          { flora: ['cattail', 'bloodmoss'], fauna: ['frogs', 'snakes', 'leeches'], foraging_yield: 'poor', encounter_type: 'dangerous' },
  coast:          { flora: ['sea grass', 'kelp'], fauna: ['seabirds', 'crabs'], foraging_yield: 'moderate', encounter_type: 'civilized' },
  tundra:         { flora: ['lichen', 'sedge'], fauna: ['reindeer', 'arctic fox'], foraging_yield: 'poor', encounter_type: 'desolate' },
  volcanic:       { flora: ['sulfur fern'], fauna: ['fire salamanders'], foraging_yield: 'none', encounter_type: 'dangerous' },
}

const DEFAULT_ECOSYSTEM: EcosystemData = {
  flora: ['grass', 'wildflower'],
  fauna: ['rabbits', 'sparrows'],
  foraging_yield: 'moderate',
  encounter_type: 'civilized',
}

export function deriveEcosystem(input: EcosystemInput): EcosystemData {
  const key: EcosystemKey = `${input.terrain_type}::${input.climate_zone}`
  return ECOSYSTEM_TABLE[key]
    ?? FALLBACK_ECOSYSTEMS[input.terrain_type]
    ?? DEFAULT_ECOSYSTEM
}
