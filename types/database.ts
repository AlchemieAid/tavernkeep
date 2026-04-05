export type ShopType = 'general' | 'weapons' | 'armor' | 'magic' | 'apothecary' | 'black_market'
export type EconomicTier = 'poor' | 'modest' | 'comfortable' | 'wealthy' | 'opulent'
export type InventoryVolatility = 'static' | 'slow' | 'moderate' | 'fast'
export type ItemCategory = 'weapon' | 'armor' | 'potion' | 'scroll' | 'tool' | 'magic_item' | 'misc'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Campaign {
  id: string
  dm_id: string
  name: string
  description: string | null
  ruleset: string
  setting: string | null
  history: string | null
  currency: string
  pantheon: string | null
  created_at: string
}

export type TownSize = 'hamlet' | 'village' | 'town' | 'city' | 'metropolis'
export type GeographicLocation = 'desert' | 'forest' | 'wilderness' | 'necropolis' | 'arctic' | 'plains' | 'riverside' | 'coastal' | 'mountain' | 'swamp' | 'underground' | 'floating' | 'jungle'
export type PoliticalSystem = 'monarchy' | 'democracy' | 'oligarchy' | 'theocracy' | 'anarchy' | 'military' | 'tribal' | 'merchant_guild' | 'magocracy'

export interface Town {
  id: string
  campaign_id: string
  dm_id: string
  name: string
  description: string | null
  population: number | null
  size: TownSize | null
  location: GeographicLocation | null
  ruler: string | null
  political_system: PoliticalSystem | null
  history: string | null
  created_at: string
  updated_at: string
}

export type NotablePersonRole = 'shopkeeper' | 'quest_giver' | 'ruler' | 'priest' | 'magician' | 'merchant' | 'guard' | 'noble' | 'commoner' | 'blacksmith' | 'innkeeper' | 'healer' | 'scholar' | 'criminal' | 'artisan'
export type ShopReputation = 'unknown' | 'poor' | 'fair' | 'good' | 'excellent'
export type ShopSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive'
export type ShopSecurity = 'none' | 'basic' | 'moderate' | 'high' | 'fortress'

export interface NotablePerson {
  id: string
  town_id: string
  dm_id: string
  name: string
  race: string | null
  role: NotablePersonRole
  backstory: string | null
  motivation: string | null
  personality_traits: string[] | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Shop {
  id: string
  campaign_id: string
  town_id: string | null
  dm_id: string
  name: string
  slug: string
  is_active: boolean
  shop_type: ShopType
  location_descriptor: string | null
  economic_tier: EconomicTier
  price_modifier: number
  haggle_enabled: boolean
  haggle_dc: number | null
  inventory_volatility: InventoryVolatility
  last_restocked_at: string | null
  notable_person_id: string | null
  reputation: ShopReputation
  size: ShopSize
  security: ShopSecurity
  operating_hours: string
  special_services: string[] | null
  // DEPRECATED: Use notable_person_id instead
  keeper_name: string | null
  keeper_race: string | null
  keeper_backstory: string | null
  keeper_motivation: string | null
  keeper_personality_traits: string[] | null
  keeper_image_url: string | null
  shop_exterior_image_url: string | null
  shop_interior_image_url: string | null
  created_at: string
  updated_at: string
}

export type ItemSource = 'purchased' | 'crafted' | 'looted' | 'generated' | 'quest_reward' | 'gift'

export interface Item {
  id: string
  shop_id: string
  name: string
  description: string | null
  category: ItemCategory
  rarity: ItemRarity
  base_price_gp: number
  stock_quantity: number
  is_hidden: boolean
  reveal_state: boolean
  hidden_condition: string | null
  image_url: string | null
  weight_lbs: number | null
  properties: Record<string, unknown> | null
  attunement_required: boolean
  cursed: boolean
  identified: boolean
  crafting_time_days: number | null
  source: ItemSource
  added_at: string
  expires_at: string | null
  deleted_at: string | null
}

export interface PartyAccess {
  id: string
  campaign_id: string
  player_alias: string | null
  session_token: string
  last_seen_at: string
}

export interface AIUsage {
  id: string
  dm_id: string
  generation_type: 'campaign' | 'town' | 'shop' | 'item'
  prompt: string
  tokens_used: number
  input_tokens: number
  output_tokens: number
  estimated_cost: number
  model: string
  created_at: string
}

export interface GenerationCache {
  id: string
  generation_type: 'campaign' | 'town' | 'shop' | 'item'
  prompt_normalized: string
  prompt_original: string
  output_data: any // JSONB
  tokens_used: number
  model: string
  times_reused: number
  average_rating: number | null
  rating_count: number
  created_at: string
  last_used_at: string
}

export interface GenerationRating {
  id: string
  cache_id: string
  dm_id: string
  rating: number
  feedback: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      campaigns: {
        Row: Campaign
        Insert: Omit<Campaign, 'id' | 'created_at'>
        Update: Partial<Omit<Campaign, 'id' | 'dm_id' | 'created_at'>>
      }
      towns: {
        Row: Town
        Insert: Omit<Town, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Town, 'id' | 'dm_id' | 'campaign_id' | 'created_at' | 'updated_at'>>
      }
      shops: {
        Row: Shop
        Insert: Omit<Shop, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Shop, 'id' | 'dm_id' | 'created_at' | 'updated_at'>>
      }
      items: {
        Row: Item
        Insert: Omit<Item, 'id' | 'added_at'>
        Update: Partial<Omit<Item, 'id' | 'shop_id' | 'added_at'>>
      }
      party_access: {
        Row: PartyAccess
        Insert: Omit<PartyAccess, 'id' | 'last_seen_at'>
        Update: Partial<Omit<PartyAccess, 'id'>>
      }
      ai_usage: {
        Row: AIUsage
        Insert: Omit<AIUsage, 'id' | 'created_at'>
        Update: Partial<Omit<AIUsage, 'id' | 'dm_id' | 'created_at'>>
      }
      generation_cache: {
        Row: GenerationCache
        Insert: Omit<GenerationCache, 'id' | 'created_at' | 'last_used_at' | 'times_reused' | 'average_rating' | 'rating_count'>
        Update: Partial<Omit<GenerationCache, 'id' | 'created_at'>>
      }
      generation_ratings: {
        Row: GenerationRating
        Insert: Omit<GenerationRating, 'id' | 'created_at'>
        Update: Partial<Omit<GenerationRating, 'id' | 'cache_id' | 'dm_id' | 'created_at'>>
      }
      notable_people: {
        Row: NotablePerson
        Insert: Omit<NotablePerson, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<NotablePerson, 'id' | 'town_id' | 'dm_id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
