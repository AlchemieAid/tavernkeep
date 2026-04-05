import { FIELD_LIMITS, FieldLimitKey } from '@/lib/constants/field-limits'

/**
 * Truncates a string to a maximum length, ensuring it doesn't exceed field limits.
 * Used to sanitize AI-generated content before database insertion.
 */
export function truncateField(value: string | null | undefined, limit: number): string | null {
  if (!value) return null
  if (value.length <= limit) return value
  return value.substring(0, limit)
}

/**
 * Truncates multiple fields in an object based on a field mapping.
 * Returns a new object with truncated values.
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
