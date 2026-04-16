/**
 * Shop Validators
 * @description Zod schemas for shop creation and updates
 */

import { z } from 'zod'

const shopTypeEnum = z.enum(['general', 'weapons', 'armor', 'magic', 'apothecary', 'black_market'])
const economicTierEnum = z.enum(['poor', 'modest', 'comfortable', 'wealthy', 'opulent'])
const inventoryVolatilityEnum = z.enum(['static', 'slow', 'moderate', 'fast'])
const shopReputationEnum = z.enum(['unknown', 'poor', 'fair', 'good', 'excellent'])
const shopSizeEnum = z.enum(['tiny', 'small', 'medium', 'large', 'massive'])
const shopSecurityEnum = z.enum(['none', 'basic', 'moderate', 'high', 'fortress'])

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
  notable_person_id: z.string().uuid('Invalid notable person ID').optional().nullable(),
  reputation: shopReputationEnum.default('fair'),
  size: shopSizeEnum.default('medium'),
  security: shopSecurityEnum.default('basic'),
  operating_hours: z.string().max(100).default('Dawn to dusk'),
  special_services: z.array(z.string().max(100)).max(10).optional().nullable(),
  // DEPRECATED: Legacy keeper fields for backward compatibility
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
  notable_person_id: z.string().uuid('Invalid notable person ID').optional().nullable(),
  reputation: shopReputationEnum.optional(),
  size: shopSizeEnum.optional(),
  security: shopSecurityEnum.optional(),
  operating_hours: z.string().max(100).optional(),
  special_services: z.array(z.string().max(100)).max(10).optional().nullable(),
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
  createNotablePerson: z.boolean().default(true),
  notablePersonId: z.string().uuid('Invalid notable person ID').optional(),
})

export type CreateShopInput = z.infer<typeof CreateShopSchema>
export type UpdateShopInput = z.infer<typeof UpdateShopSchema>
export type GenerateShopInput = z.infer<typeof GenerateShopSchema>
