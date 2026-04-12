export const SHOP_TYPES = [
  'general',
  'weapons',
  'armor',
  'magic',
  'apothecary',
  'black_market',
] as const

export const ECONOMIC_TIERS = [
  'poor',
  'modest',
  'comfortable',
  'wealthy',
  'opulent',
] as const

export const INVENTORY_VOLATILITY = [
  'static',
  'slow',
  'moderate',
  'fast',
] as const

export const ITEM_CATEGORIES = [
  'weapon',
  'armor',
  'potion',
  'scroll',
  'tool',
  'magic_item',
  'misc',
] as const

export const ITEM_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
] as const

export const RARITY_COLORS = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  very_rare: 'text-rarity-very-rare',
  legendary: 'text-rarity-legendary',
} as const

export const SHOP_TYPE_LABELS = {
  general: 'General Store',
  weapons: 'Weapons Shop',
  armor: 'Armor Shop',
  magic: 'Magic Shop',
  apothecary: 'Apothecary',
  black_market: 'Black Market',
} as const

export const ECONOMIC_TIER_LABELS = {
  poor: 'Poor',
  modest: 'Modest',
  comfortable: 'Comfortable',
  wealthy: 'Wealthy',
  opulent: 'Opulent',
} as const

export const VOLATILITY_LABELS = {
  static: 'Static (No rotation)',
  slow: 'Slow (~10% per restock)',
  moderate: 'Moderate (~30% per restock)',
  fast: 'Fast (~60% per restock)',
} as const

export const MIN_PRICE_MODIFIER = 50
export const MAX_PRICE_MODIFIER = 200
export const DEFAULT_PRICE_MODIFIER = 100

export const MIN_HAGGLE_DC = 5
export const MAX_HAGGLE_DC = 30
export const DEFAULT_HAGGLE_DC = 15

export const SLUG_LENGTH = 10
