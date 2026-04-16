/**
 * Item Validators
 * @description Zod schemas for item creation and updates
 */

import { z } from 'zod'

const itemCategoryEnum = z.enum(['weapon', 'armor', 'potion', 'scroll', 'tool', 'magic_item', 'misc'])
const itemRarityEnum = z.enum(['common', 'uncommon', 'rare', 'very_rare', 'legendary'])

const itemSourceEnum = z.enum(['purchased', 'crafted', 'looted', 'generated', 'quest_reward', 'gift'])

export const CreateItemSchema = z.object({
  shop_id: z.string().uuid('Invalid shop ID'),
  name: z.string().min(1, 'Item name is required').max(100, 'Item name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  category: itemCategoryEnum,
  rarity: itemRarityEnum,
  base_price_gp: z.number().min(0, 'Price must be positive'),
  stock_quantity: z.number().int().min(0, 'Stock must be non-negative').default(1),
  is_hidden: z.boolean().default(false),
  reveal_state: z.boolean().default(false),
  hidden_condition: z.string().max(500).optional().nullable(),
  weight_lbs: z.number().min(0).optional().nullable(),
  properties: z.record(z.unknown()).optional().nullable(),
  attunement_required: z.boolean().default(false),
  cursed: z.boolean().default(false),
  identified: z.boolean().default(true),
  crafting_time_days: z.number().int().min(0).optional().nullable(),
  source: itemSourceEnum.default('generated'),
  expires_at: z.string().datetime().optional().nullable(),
})

export const UpdateItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100, 'Item name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  category: itemCategoryEnum.optional(),
  rarity: itemRarityEnum.optional(),
  base_price_gp: z.number().min(0, 'Price must be positive').optional(),
  stock_quantity: z.number().int().min(0, 'Stock must be non-negative').optional(),
  is_hidden: z.boolean().optional(),
  reveal_state: z.boolean().optional(),
  hidden_condition: z.string().max(500).optional().nullable(),
  weight_lbs: z.number().min(0).optional().nullable(),
  properties: z.record(z.unknown()).optional().nullable(),
  attunement_required: z.boolean().optional(),
  cursed: z.boolean().optional(),
  identified: z.boolean().optional(),
  crafting_time_days: z.number().int().min(0).optional().nullable(),
  source: itemSourceEnum.optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

export const GenerateItemsSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt too long'),
  count: z.number().int().min(1).max(20).default(5),
})

export type CreateItemInput = z.infer<typeof CreateItemSchema>
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>
export type GenerateItemsInput = z.infer<typeof GenerateItemsSchema>
