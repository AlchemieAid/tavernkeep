import type { ResourceScores } from './terrainScores'

export type PoICategory =
  | 'settlement'
  | 'military'
  | 'arcane'
  | 'dungeon'
  | 'religious'
  | 'natural'
  | 'ruin'
  | 'infrastructure'
  | 'wilderness'

export interface PoIDefinition {
  type: string
  category: PoICategory
  label: string
  icon: string
  mapColor: string
  description: string
  economicModifiers?: Partial<ResourceScores>
}

export const POI_DEFINITIONS: PoIDefinition[] = [
  // ── SETTLEMENTS ──────────────────────────────────────────────────────────
  { type: 'hamlet',          category: 'settlement',     label: 'Hamlet',                   icon: '🏘', mapColor: '#7c6a4e',
    description: 'A tiny cluster of homes, too small to generate as a full town.',
    economicModifiers: { agriculture: 0.1 } },
  { type: 'farmstead',       category: 'settlement',     label: 'Farmstead / Homestead',    icon: '🌾', mapColor: '#8a7a3e',
    description: 'An isolated farm family or small estate.',
    economicModifiers: { agriculture: 0.15 } },
  { type: 'fishing_village', category: 'settlement',     label: 'Fishing Village',          icon: '🎣', mapColor: '#4e7a8e',
    description: 'A waterside community living off the catch.',
    economicModifiers: { fishing: 0.2 } },
  { type: 'nomad_camp',      category: 'settlement',     label: 'Nomad Camp',               icon: '⛺', mapColor: '#9e8a5e',
    description: 'A temporary camp of a traveling people.' },
  { type: 'refugee_camp',    category: 'settlement',     label: 'Refugee Camp',             icon: '🏕', mapColor: '#9e7a5e',
    description: 'Displaced people seeking safety.' },
  { type: 'logging_camp',    category: 'settlement',     label: 'Logging Camp',             icon: '🪵', mapColor: '#5e7a4e',
    description: 'A seasonal camp harvesting the forest.',
    economicModifiers: { forestry: 0.15 } },
  { type: 'mining_camp',     category: 'settlement',     label: 'Mining Camp',              icon: '⛏', mapColor: '#7a6a5e',
    description: 'Workers extracting ore or stone.',
    economicModifiers: { mining: 0.15 } },
  { type: 'outpost',         category: 'settlement',     label: 'Outpost / Garrison',       icon: '🏳', mapColor: '#6e7a8e',
    description: 'A small armed presence at the edge of civilization.' },
  { type: 'waystation',      category: 'settlement',     label: 'Waystation',               icon: '🛖', mapColor: '#8e7a6e',
    description: 'A rest stop on a long road.',
    economicModifiers: { trade_access: 0.1 } },

  // ── MILITARY ─────────────────────────────────────────────────────────────
  { type: 'castle',          category: 'military',       label: 'Castle / Keep',            icon: '🏰', mapColor: '#5a7a9e',
    description: 'A fortified noble residence dominating the surrounding land.',
    economicModifiers: { trade_access: 0.2, wealth: 0.2 } },
  { type: 'fortress',        category: 'military',       label: 'Fortress',                 icon: '🗼', mapColor: '#4e6a8e',
    description: 'A purely military installation built to hold a strategic point.' },
  { type: 'watchtower',      category: 'military',       label: 'Watchtower',               icon: '🔭', mapColor: '#6e8a9e',
    description: 'A lone tower keeping watch over roads or borders.' },
  { type: 'ruined_fortress', category: 'military',       label: 'Ruined Fortress',          icon: '🏚', mapColor: '#7a7a8e',
    description: 'A collapsed military structure, possibly still occupied.' },
  { type: 'siege_camp',      category: 'military',       label: 'Siege Camp',               icon: '⚔️', mapColor: '#8e5e5e',
    description: 'An active or abandoned siege encampment.' },
  { type: 'battlefield',     category: 'military',       label: 'Battlefield',              icon: '💀', mapColor: '#7a5e5e',
    description: 'Scarred earth where a great conflict was decided.' },
  { type: 'mercenary_camp',  category: 'military',       label: 'Mercenary Camp',           icon: '🗡', mapColor: '#7e6e5e',
    description: 'Swords for hire, camped between contracts.' },
  { type: 'prison',          category: 'military',       label: 'Prison / Dungeon Keep',    icon: '⛓', mapColor: '#5e5e7e',
    description: 'A facility for holding prisoners, often underground.' },

  // ── ARCANE ───────────────────────────────────────────────────────────────
  { type: 'wizard_tower',    category: 'arcane',         label: "Wizard's Tower",           icon: '🗼', mapColor: '#7a5e9e',
    description: 'The isolated residence of a powerful spellcaster.',
    economicModifiers: { wealth: 0.1 } },
  { type: 'arcane_nexus',    category: 'arcane',         label: 'Arcane Nexus',             icon: '✨', mapColor: '#9e5ebe',
    description: 'A convergence of magical energy, amplifying surrounding resource values.',
    economicModifiers: { agriculture: 0.1, mining: 0.1, forestry: 0.1, wealth: 0.2 } },
  { type: 'ley_line',        category: 'arcane',         label: 'Ley Line Crossing',        icon: '🌀', mapColor: '#8e4eae',
    description: 'Where two ley lines cross, power pools.' },
  { type: 'portal',          category: 'arcane',         label: 'Portal / Gateway',         icon: '🔮', mapColor: '#6e3e9e',
    description: 'A fixed point of planar or long-distance transport.',
    economicModifiers: { trade_access: 0.3 } },
  { type: 'enchanted_grove', category: 'arcane',         label: 'Enchanted Grove',          icon: '🌳', mapColor: '#5e7e6e',
    description: 'A forest glade imbued with fey or druidic magic.',
    economicModifiers: { forestry: 0.15, agriculture: 0.1 } },
  { type: 'elemental_node',  category: 'arcane',         label: 'Elemental Node',           icon: '🔥', mapColor: '#ae6e4e',
    description: 'A place where an elemental plane bleeds into the material world.' },
  { type: 'cursed_ground',   category: 'arcane',         label: 'Cursed Ground',            icon: '☠️', mapColor: '#5e4e5e',
    description: 'An area of persistent dark magic. Animals avoid it. Crops fail nearby.' },
  { type: 'ritual_circle',   category: 'arcane',         label: 'Ritual Circle',            icon: '⭕', mapColor: '#7e5e8e',
    description: 'A carved stone or earthen circle used for magical ceremonies.' },
  { type: 'sealed_vault',    category: 'arcane',         label: 'Sealed Vault',             icon: '🔒', mapColor: '#4e4e7e',
    description: 'Something was locked away here. No one remembers why.' },

  // ── DUNGEONS ─────────────────────────────────────────────────────────────
  { type: 'dungeon_entrance',category: 'dungeon',        label: 'Dungeon Entrance',         icon: '🕳', mapColor: '#9e5e5e',
    description: 'The known entry point to a subterranean complex.' },
  { type: 'cave_system',     category: 'dungeon',        label: 'Cave System',              icon: '🪨', mapColor: '#8e6e5e',
    description: 'A natural cave network, possibly inhabited.',
    economicModifiers: { mining: 0.1 } },
  { type: 'abandoned_mine',  category: 'dungeon',        label: 'Abandoned Mine',           icon: '⛏', mapColor: '#7e6e6e',
    description: 'A worked-out mine, left for a reason.' },
  { type: 'crypt',           category: 'dungeon',        label: 'Crypt',                    icon: '⚰️', mapColor: '#6e5e6e',
    description: 'An above-ground burial structure, usually for the noble dead.' },
  { type: 'catacombs',       category: 'dungeon',        label: 'Catacombs',                icon: '💀', mapColor: '#6e5e5e',
    description: 'Miles of tunnels lined with the dead.' },
  { type: 'ancient_tomb',    category: 'dungeon',        label: 'Ancient Tomb',             icon: '🪦', mapColor: '#7e6e5e',
    description: 'A sealed burial chamber of someone important.' },
  { type: 'labyrinth',       category: 'dungeon',        label: 'Labyrinth',                icon: '🌀', mapColor: '#7e5e7e',
    description: 'A deliberately constructed maze, built to imprison or test.' },
  { type: 'sunken_ruins',    category: 'dungeon',        label: 'Sunken Ruins',             icon: '🌊', mapColor: '#4e6e7e',
    description: 'Structures partially or fully submerged.' },
  { type: 'collapsed_temple',category: 'dungeon',        label: 'Collapsed Temple',         icon: '🏛', mapColor: '#7e6e5e',
    description: 'A religious structure brought down by time, war, or divine judgment.' },

  // ── RELIGIOUS ────────────────────────────────────────────────────────────
  { type: 'temple',          category: 'religious',      label: 'Temple / Shrine',          icon: '⛩', mapColor: '#5e9e7a',
    description: 'An active place of worship.',
    economicModifiers: { trade_access: 0.1, wealth: 0.1 } },
  { type: 'monastery',       category: 'religious',      label: 'Monastery / Abbey',        icon: '🏯', mapColor: '#4e8e6a',
    description: 'A self-sufficient religious community.',
    economicModifiers: { agriculture: 0.1, forestry: 0.1 } },
  { type: 'standing_stones', category: 'religious',      label: 'Standing Stones',          icon: '🗿', mapColor: '#6e7e6e',
    description: 'Ancient megaliths of unknown origin. Still carry power.' },
  { type: 'ancient_altar',   category: 'religious',      label: 'Ancient Altar',            icon: '🔥', mapColor: '#8e6e5e',
    description: 'A sacrificial or devotional stone structure predating current civilizations.' },
  { type: 'oracle',          category: 'religious',      label: "Oracle's Sanctum",         icon: '👁', mapColor: '#7e7e9e',
    description: 'A place where seers commune with forces beyond mortal understanding.' },
  { type: 'holy_spring',     category: 'religious',      label: 'Holy Spring',              icon: '💧', mapColor: '#5e8e9e',
    description: 'A sacred water source with healing or divine properties.',
    economicModifiers: { water_access: 0.2, wealth: 0.1 } },
  { type: 'graveyard',       category: 'religious',      label: 'Graveyard',                icon: '🪦', mapColor: '#6e7e6e',
    description: 'A burial ground, sacred or neglected.' },
  { type: 'pilgrimage_road', category: 'religious',      label: 'Pilgrimage Site',          icon: '🛤', mapColor: '#8e8e6e',
    description: 'A destination or waypoint on a known pilgrimage route.',
    economicModifiers: { trade_access: 0.15 } },

  // ── NATURAL FEATURES ─────────────────────────────────────────────────────
  { type: 'pond',            category: 'natural',        label: 'Pond / Small Lake',        icon: '💧', mapColor: '#4e8a9e',
    description: 'A small body of fresh water.',
    economicModifiers: { water_access: 0.2, fishing: 0.1 } },
  { type: 'waterfall',       category: 'natural',        label: 'Waterfall',                icon: '🌊', mapColor: '#4e7a9e',
    description: 'A dramatic cascade — a landmark, a power source, a sacred site.',
    economicModifiers: { water_access: 0.2 } },
  { type: 'hot_springs',     category: 'natural',        label: 'Hot Springs',              icon: '♨️', mapColor: '#9e5e4e',
    description: 'Geothermally heated water. Draws travelers and settlers.',
    economicModifiers: { water_access: 0.15, wealth: 0.1 } },
  { type: 'geyser',          category: 'natural',        label: 'Geyser',                   icon: '💨', mapColor: '#9e6e4e',
    description: 'A periodic eruption of boiling water from the earth.' },
  { type: 'sinkhole',        category: 'natural',        label: 'Sinkhole',                 icon: '⬇️', mapColor: '#6e5e4e',
    description: 'A sudden collapse in the ground. Something is below.' },
  { type: 'sea_cave',        category: 'natural',        label: 'Sea Cave',                 icon: '🌊', mapColor: '#4e6e8e',
    description: 'A coastal cave accessible by water, used by smugglers and sea creatures.' },
  { type: 'gorge',           category: 'natural',        label: 'Gorge / Canyon',           icon: '🏔', mapColor: '#7e6e5e',
    description: 'A deep cleft in the earth carved by water over millennia.' },
  { type: 'ancient_tree',    category: 'natural',        label: 'Ancient Tree',             icon: '🌲', mapColor: '#4e7e4e',
    description: 'A tree so old it has become a landmark. Possibly sentient.',
    economicModifiers: { forestry: 0.1 } },
  { type: 'volcanic_vent',   category: 'natural',        label: 'Volcanic Vent',            icon: '🌋', mapColor: '#9e4e3e',
    description: 'A crack in the earth venting superheated gas and minerals.' },

  // ── RUINS ────────────────────────────────────────────────────────────────
  { type: 'ancient_ruins',   category: 'ruin',           label: 'Ancient Ruins',            icon: '🏛', mapColor: '#9e7a3e',
    description: 'The remnants of a civilization no longer remembered.' },
  { type: 'fallen_city',     category: 'ruin',           label: 'Fallen City',              icon: '🏙', mapColor: '#8e6e3e',
    description: 'An entire city brought to ruin. The streets are still there.' },
  { type: 'lost_library',    category: 'ruin',           label: 'Lost Library',             icon: '📚', mapColor: '#7e6e5e',
    description: 'A repository of knowledge, sealed or shattered.' },
  { type: 'monument',        category: 'ruin',           label: 'Memorial / Monument',      icon: '🗽', mapColor: '#8e7e5e',
    description: 'Built to honor a person or event. The original meaning may be lost.' },
  { type: 'broken_aqueduct', category: 'ruin',           label: 'Broken Aqueduct',          icon: '🌉', mapColor: '#7e7e5e',
    description: 'A once-great water infrastructure, now partially functional.',
    economicModifiers: { water_access: 0.1 } },
  { type: 'colosseum',       category: 'ruin',           label: 'Ruined Colosseum',         icon: '⭕', mapColor: '#9e7e4e',
    description: 'An arena for spectacle, long abandoned.' },
  { type: 'shattered_lighthouse', category: 'ruin',      label: 'Shattered Lighthouse',    icon: '🔦', mapColor: '#7e8e6e',
    description: 'A coastal beacon, destroyed. Ships still sometimes run aground here.' },
  { type: 'abandoned_village', category: 'ruin',         label: 'Abandoned Village',        icon: '🏚', mapColor: '#8e7e6e',
    description: 'Empty homes, overgrown roads. Everyone left — or was taken.' },

  // ── INFRASTRUCTURE ───────────────────────────────────────────────────────
  { type: 'bridge',          category: 'infrastructure', label: 'Bridge',                   icon: '🌉', mapColor: '#4e8a9e',
    description: 'A crossing point over a river or gorge. Whoever controls it controls traffic.',
    economicModifiers: { trade_access: 0.25 } },
  { type: 'ferry_crossing',  category: 'infrastructure', label: 'Ferry Crossing',           icon: '⛵', mapColor: '#4e7a8e',
    description: 'A boat-based crossing where no bridge exists.',
    economicModifiers: { trade_access: 0.15 } },
  { type: 'waystone',        category: 'infrastructure', label: 'Waystone / Milestone',     icon: '🪨', mapColor: '#6e7e6e',
    description: 'A carved stone marking distance or direction on a road.' },
  { type: 'crossroads',      category: 'infrastructure', label: 'Crossroads',               icon: '✚', mapColor: '#7e8e5e',
    description: 'Where two or more roads meet. Commerce and folklore both concentrate here.',
    economicModifiers: { trade_access: 0.2 } },
  { type: 'lighthouse',      category: 'infrastructure', label: 'Lighthouse',               icon: '🔦', mapColor: '#5e8e9e',
    description: 'A navigational beacon on the coast.',
    economicModifiers: { trade_access: 0.15, fishing: 0.1 } },
  { type: 'mill',            category: 'infrastructure', label: 'Mill (water or wind)',      icon: '⚙️', mapColor: '#7e8e5e',
    description: 'A processing facility for grain or lumber.',
    economicModifiers: { agriculture: 0.15, forestry: 0.1 } },
  { type: 'inn_roadhouse',   category: 'infrastructure', label: 'Inn / Roadhouse',          icon: '🍺', mapColor: '#8e7e5e',
    description: 'A rest stop offering food, drink, beds, and rumors.',
    economicModifiers: { trade_access: 0.1 } },
  { type: 'tollgate',        category: 'infrastructure', label: 'Tollgate',                 icon: '🚧', mapColor: '#9e8e4e',
    description: 'A checkpoint where tolls are collected on a road or bridge.',
    economicModifiers: { trade_access: -0.05, wealth: 0.05 } },
  { type: 'aqueduct',        category: 'infrastructure', label: 'Aqueduct',                 icon: '🌁', mapColor: '#5e8e7e',
    description: 'An active water transport system. Rare and valuable.',
    economicModifiers: { water_access: 0.3, agriculture: 0.2 } },

  // ── WILDERNESS ───────────────────────────────────────────────────────────
  { type: 'dragons_lair',    category: 'wilderness',     label: "Dragon's Lair",            icon: '🐉', mapColor: '#9e4e4e',
    description: 'A dragon claims this territory. Avoid — or seek out, if brave.' },
  { type: 'giants_hall',     category: 'wilderness',     label: "Giant's Hall",             icon: '🏔', mapColor: '#7e6e5e',
    description: 'A location associated with giants.' },
  { type: 'fey_crossing',    category: 'wilderness',     label: 'Fey Crossing',             icon: '🌸', mapColor: '#9e5e8e',
    description: 'A thin place where the Feywild bleeds through.',
    economicModifiers: { forestry: 0.1, wealth: 0.1 } },
  { type: 'witch_hut',       category: 'wilderness',     label: "Witch's Hut",              icon: '🧙', mapColor: '#6e5e7e',
    description: "The home of a solitary practitioner. May be helpful. May not." },
  { type: 'hermit',          category: 'wilderness',     label: "Hermit's Dwelling",        icon: '🧑', mapColor: '#7e7e5e',
    description: 'Someone chose to live far from others. Usually for a reason.' },
  { type: 'rangers_outpost', category: 'wilderness',     label: "Ranger's Outpost",         icon: '🏹', mapColor: '#5e7e4e',
    description: 'A hidden base for those who patrol the wild.' },
  { type: 'bandit_hideout',  category: 'wilderness',     label: 'Bandit Hideout',           icon: '🗡', mapColor: '#8e5e4e',
    description: 'A concealed camp used by outlaws.' },
  { type: 'monster_den',     category: 'wilderness',     label: 'Monster Den',              icon: '👹', mapColor: '#7e4e4e',
    description: 'Home to something dangerous enough to threaten travelers.' },
  { type: 'thieves_refuge',  category: 'wilderness',     label: "Thieves' Refuge",          icon: '🎭', mapColor: '#5e5e7e',
    description: 'A secret meeting place and safe house for criminal networks.' },
]

export const POI_DEFINITION_MAP: Map<string, PoIDefinition> = new Map(
  POI_DEFINITIONS.map(d => [d.type, d])
)

export function getPoIDefinition(type: string): PoIDefinition | undefined {
  return POI_DEFINITION_MAP.get(type)
}

export function getPoIsByCategory(category: PoICategory): PoIDefinition[] {
  return POI_DEFINITIONS.filter(d => d.category === category)
}
