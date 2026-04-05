import { z } from 'zod'

const shopTypeEnum = z.enum(['general', 'weapons', 'armor', 'magic', 'apothecary', 'black_market'])
const economicTierEnum = z.enum(['poor', 'modest', 'comfortable', 'wealthy', 'opulent'])
const inventoryVolatilityEnum = z.enum(['static', 'slow', 'moderate', 'fast'])

export const CreateShopSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign ID'),
  town_id: z.string().uuid('Invalid town ID').optional().nullable(),
  name: z.string().min(1, 'Shop name is required').max(100, 'Shop name too long'),
  shop_type: shopTypeEnum,
  location_descriptor: z.string().max(200, 'Location descriptor too long').optional().nullable(),
  economic_tier: economicTierEnum,
  price_modifier: z.number().min(0.1).max(10).default(1.0),
  haggle_enabled: z.boolean().default(false),
  haggle_dc: z.number().int().min(5).max(30).optional().nullable(),
  inventory_volatility: inventoryVolatilityEnum.default('moderate'),
  keeper_name: z.string().max(100).optional().nullable(),
  keeper_race: z.string().max(50).optional().nullable(),
  keeper_backstory: z.string().max(1000).optional().nullable(),
  keeper_motivation: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
})

export const UpdateShopSchema = z.object({
  name: z.string().min(1, 'Shop name is required').max(100, 'Shop name too long').optional(),
  shop_type: shopTypeEnum.optional(),
  location_descriptor: z.string().max(200, 'Location descriptor too long').optional().nullable(),
  economic_tier: economicTierEnum.optional(),
  price_modifier: z.number().min(0.1).max(10).optional(),
  haggle_enabled: z.boolean().optional(),
  haggle_dc: z.number().int().min(5).max(30).optional().nullable(),
  inventory_volatility: inventoryVolatilityEnum.optional(),
  keeper_name: z.string().max(100).optional().nullable(),
  keeper_race: z.string().max(50).optional().nullable(),
  keeper_backstory: z.string().max(1000).optional().nullable(),
  keeper_motivation: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
})

export const GenerateShopSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  townId: z.string().uuid('Invalid town ID').optional(),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt too long'),
})

export type CreateShopInput = z.infer<typeof CreateShopSchema>
export type UpdateShopInput = z.infer<typeof UpdateShopSchema>
export type GenerateShopInput = z.infer<typeof GenerateShopSchema>
