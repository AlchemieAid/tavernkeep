/**
 * Database Types
 * @description Type definitions for all database tables and operations
 * @note Re-exports Supabase generated types with convenience aliases
 */

// Re-export generated Supabase types for backward compatibility
export type { Database } from '@/lib/supabase/database.types'
import type { Database } from '@/lib/supabase/database.types'

// Convenience type exports
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Town = Database['public']['Tables']['towns']['Row']
export type Shop = Database['public']['Tables']['shops']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type NotablePerson = Database['public']['Tables']['notable_people']['Row']
export type ItemLibrary = Database['public']['Tables']['item_library']['Row']
export type CatalogItem = Database['public']['Tables']['catalog_items']['Row']
export type CampaignMember = Database['public']['Tables']['campaign_members']['Row']
export type Character = Database['public']['Tables']['characters']['Row']
export type CartItem = Database['public']['Tables']['cart_items']['Row']

// Enum exports
export type ShopType = Database['public']['Enums']['shop_type']
export type EconomicTier = Database['public']['Enums']['economic_tier']
export type InventoryVolatility = Database['public']['Enums']['inventory_volatility']
export type ItemCategory = Database['public']['Enums']['item_category']
export type ItemRarity = Database['public']['Enums']['item_rarity']
export type ItemSource = Database['public']['Enums']['item_source']
export type TownSize = Database['public']['Enums']['town_size']
export type GeographicLocation = Database['public']['Enums']['geographic_location']
export type PoliticalSystem = Database['public']['Enums']['political_system']
export type NotablePersonRole = string
export type ShopReputation = Database['public']['Enums']['shop_reputation']
export type ShopSecurity = Database['public']['Enums']['shop_security']
export type ShopSize = Database['public']['Enums']['shop_size']
