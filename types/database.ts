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
  created_at: string
}

export interface Shop {
  id: string
  campaign_id: string
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
  hidden_condition: string | null
  image_url: string | null
  weight_lbs: number | null
  properties: Record<string, unknown> | null
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
    }
  }
}
