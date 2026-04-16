/**
 * Item Library Validators
 * @description Zod schemas for DM's personal item library
 */

import { z } from 'zod'

export const WEAPON_PROPERTIES = [
  'ammunition', 'finesse', 'heavy', 'light', 'loading', 'reach',
  'special', 'thrown', 'two-handed', 'versatile',
] as const

export const DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'lightning', 'thunder',
  'poison', 'acid', 'radiant', 'necrotic', 'psychic', 'force',
] as const

export const weaponPropertiesSchema = z.object({
  damage_dice: z.string().min(1, 'Required (e.g. 1d8)'),
  damage_type: z.enum(DAMAGE_TYPES),
  weapon_category: z.enum(['simple', 'martial']),
  weapon_type: z.enum(['melee', 'ranged']),
  properties: z.array(z.string()).default([]),
  versatile_damage: z.string().optional(),
  range_short: z.number().int().positive().optional(),
  range_long: z.number().int().positive().optional(),
})

export const armorPropertiesSchema = z.object({
  armor_class: z.number().int().min(1).max(30),
  armor_category: z.enum(['light', 'medium', 'heavy', 'shield']),
  max_dex_bonus: z.number().int().min(0).nullable(),
  str_requirement: z.number().int().min(0).default(0),
  stealth_disadvantage: z.boolean().default(false),
  don_time: z.string().optional(),
  doff_time: z.string().optional(),
})

export const potionPropertiesSchema = z.object({
  healing_dice: z.string().optional(),
  healing_bonus: z.number().int().optional(),
  temp_hp: z.number().int().optional(),
  effect: z.string().optional(),
  duration: z.string().optional(),
})

export const scrollPropertiesSchema = z.object({
  spell_level: z.number().int().min(0).max(9),
  save_dc: z.number().int().min(1).max(30).optional(),
  attack_bonus: z.number().int().min(0).max(20).optional(),
})

export const magicItemPropertiesSchema = z.object({
  charges: z.number().int().min(0).optional(),
  recharge: z.string().optional(),
  ac_bonus: z.number().int().min(0).optional(),
  saving_throw_bonus: z.number().int().min(0).optional(),
  darkvision_range: z.number().int().min(0).optional(),
  effect: z.string().optional(),
})

export const RULESET_OPTIONS = [
  { value: '5e', label: 'D&D 5e' },
  { value: 'pathfinder', label: 'Pathfinder' },
  { value: 'pathfinder2e', label: 'Pathfinder 2e' },
  { value: 'osr', label: 'OSR / Old School' },
  { value: 'custom', label: 'Custom / Homebrew' },
] as const

export const SHOP_TAG_OPTIONS = [
  { value: 'general', label: 'General Store' },
  { value: 'weapons', label: 'Weapons' },
  { value: 'armor', label: 'Armor' },
  { value: 'magic', label: 'Magic Shop' },
  { value: 'apothecary', label: 'Apothecary' },
  { value: 'black_market', label: 'Black Market' },
] as const

export const itemLibrarySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(1000).optional(),
  ruleset: z.string().default('5e'),
  category: z.enum(['weapon', 'armor', 'potion', 'scroll', 'tool', 'magic_item', 'misc']),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'legendary']),
  base_price_gp: z.number().int().min(0),
  weight_lbs: z.number().min(0).optional().nullable(),
  is_magical: z.boolean().default(false),
  attunement_required: z.boolean().default(false),
  cursed: z.boolean().default(false),
  shop_tags: z.array(z.string()).min(1, 'Select at least one shop type'),
  notes: z.string().max(500).optional(),
  weapon_props: weaponPropertiesSchema.optional(),
  armor_props: armorPropertiesSchema.optional(),
  potion_props: potionPropertiesSchema.optional(),
  scroll_props: scrollPropertiesSchema.optional(),
  magic_item_props: magicItemPropertiesSchema.optional(),
})

export type ItemLibraryFormValues = z.infer<typeof itemLibrarySchema>

export function buildProperties(values: ItemLibraryFormValues): Record<string, unknown> | null {
  switch (values.category) {
    case 'weapon':
      return values.weapon_props ? { ...values.weapon_props } : null
    case 'armor':
      return values.armor_props ? { ...values.armor_props } : null
    case 'potion':
      return values.potion_props && Object.values(values.potion_props).some(Boolean)
        ? { ...values.potion_props }
        : null
    case 'scroll':
      return values.scroll_props ? { ...values.scroll_props } : null
    case 'magic_item':
      return values.magic_item_props && Object.values(values.magic_item_props).some(Boolean)
        ? { ...values.magic_item_props }
        : null
    default:
      return null
  }
}
