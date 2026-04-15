/**
 * Field Truncation Utilities
 * 
 * @fileoverview
 * Utilities for truncating AI-generated content to match database field limits.
 * Prevents PostgreSQL errors from oversized strings and ensures data integrity.
 * 
 * @architecture
 * **Truncation Strategy:**
 * ```
 * AI generates content → Truncate to DB limits → Insert safely
 * ```
 * 
 * **Why Truncation?**
 * - AI doesn't always respect character limits
 * - Database has VARCHAR constraints
 * - Prevents insertion errors
 * - Maintains data integrity
 * 
 * **Field Maps:**
 * Pre-defined mappings for each entity type (campaign, town, shop, etc.)
 * ensure consistent truncation across the application.
 * 
 * @example
 * ```typescript
 * import { truncateFields, CAMPAIGN_FIELD_MAP } from './truncate-fields'
 * 
 * const aiData = {
 *   name: 'A'.repeat(300), // Too long!
 *   description: 'B'.repeat(2000) // Too long!
 * }
 * 
 * const safe = truncateFields(aiData, CAMPAIGN_FIELD_MAP)
 * // safe.name is now 255 chars max
 * // safe.description is now 1000 chars max
 * ```
 * 
 * @see {@link FIELD_LIMITS} for limit definitions
 */

import { FIELD_LIMITS, FieldLimitKey } from '@/lib/constants/field-limits'

/**
 * Truncate a single string field to a maximum length
 * 
 * @param value - String to truncate (or null/undefined)
 * @param limit - Maximum character length
 * @returns Truncated string or null
 * 
 * @description
 * Safely truncates a string to fit database field limits. Returns null
 * for null/undefined inputs. Uses substring() for clean truncation.
 * 
 * **Behavior:**
 * - null/undefined → null
 * - Length ≤ limit → unchanged
 * - Length > limit → truncated to limit
 * 
 * @example
 * ```typescript
 * truncateField('Hello World', 5) // 'Hello'
 * truncateField('Hi', 10) // 'Hi'
 * truncateField(null, 10) // null
 * ```
 */
export function truncateField(value: string | null | undefined, limit: number): string | null {
  if (!value) return null
  if (value.length <= limit) return value
  return value.substring(0, limit)
}

/**
 * Truncate multiple fields in an object using a field map
 * 
 * @param data - Object with fields to truncate
 * @param fieldMap - Mapping of field names to character limits
 * @returns New object with truncated string fields
 * 
 * @description
 * Applies truncation to multiple fields at once using a predefined mapping.
 * Only truncates string fields; other types are left unchanged. Returns a
 * new object (does not mutate input).
 * 
 * **Process:**
 * 1. Clone input object
 * 2. For each field in mapping
 * 3. If field exists and is string → truncate
 * 4. Return new object
 * 
 * @example
 * ```typescript
 * const campaign = {
 *   name: 'A'.repeat(300),
 *   description: 'B'.repeat(2000),
 *   ruleset: '5e'
 * }
 * 
 * const safe = truncateFields(campaign, CAMPAIGN_FIELD_MAP)
 * // safe.name: 255 chars
 * // safe.description: 1000 chars
 * // safe.ruleset: '5e' (unchanged, within limit)
 * ```
 */
export function truncateFields<T extends Record<string, any>>(
  data: T,
  fieldMap: Partial<Record<keyof T, number>>
): T {
  const result: any = { ...data }
  
  for (const [field, limit] of Object.entries(fieldMap)) {
    if (field in result && typeof result[field] === 'string') {
      result[field] = truncateField(result[field], limit as number)
    }
  }
  
  return result as T
}

/**
 * Campaign field truncation mapping
 */
export const CAMPAIGN_FIELD_MAP = {
  name: FIELD_LIMITS.CAMPAIGN_NAME,
  description: FIELD_LIMITS.CAMPAIGN_DESCRIPTION,
  ruleset: FIELD_LIMITS.CAMPAIGN_RULESET,
  setting: FIELD_LIMITS.CAMPAIGN_SETTING,
  history: FIELD_LIMITS.CAMPAIGN_HISTORY,
  currency_name: FIELD_LIMITS.CAMPAIGN_CURRENCY_NAME,
  currency_description: FIELD_LIMITS.CAMPAIGN_CURRENCY_DESCRIPTION,
  pantheon: FIELD_LIMITS.CAMPAIGN_PANTHEON,
} as const

/**
 * Town field truncation mapping
 */
export const TOWN_FIELD_MAP = {
  name: FIELD_LIMITS.TOWN_NAME,
  description: FIELD_LIMITS.TOWN_DESCRIPTION,
  ruler: FIELD_LIMITS.TOWN_RULER,
  history: FIELD_LIMITS.TOWN_HISTORY,
} as const

/**
 * Notable Person field truncation mapping
 */
export const NOTABLE_PERSON_FIELD_MAP = {
  name: FIELD_LIMITS.NOTABLE_PERSON_NAME,
  race: FIELD_LIMITS.NOTABLE_PERSON_RACE,
  backstory: FIELD_LIMITS.NOTABLE_PERSON_BACKSTORY,
  motivation: FIELD_LIMITS.NOTABLE_PERSON_MOTIVATION,
} as const

/**
 * Shop field truncation mapping
 */
export const SHOP_FIELD_MAP = {
  name: FIELD_LIMITS.SHOP_NAME,
  location_descriptor: FIELD_LIMITS.SHOP_LOCATION_DESCRIPTOR,
  keeper_name: FIELD_LIMITS.SHOP_KEEPER_NAME,
  keeper_race: FIELD_LIMITS.SHOP_KEEPER_RACE,
  keeper_backstory: FIELD_LIMITS.SHOP_KEEPER_BACKSTORY,
  keeper_motivation: FIELD_LIMITS.SHOP_KEEPER_MOTIVATION,
  operating_hours: FIELD_LIMITS.SHOP_OPERATING_HOURS,
} as const

/**
 * Item field truncation mapping
 */
export const ITEM_FIELD_MAP = {
  name: FIELD_LIMITS.ITEM_NAME,
  description: FIELD_LIMITS.ITEM_DESCRIPTION,
  hidden_condition: FIELD_LIMITS.ITEM_HIDDEN_CONDITION,
} as const
