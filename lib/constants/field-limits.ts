/**
 * Single source of truth for all field length limits across the application.
 * These limits are enforced in:
 * - Database schema (via CHECK constraints where needed)
 * - Zod validators (for API validation)
 * - AI prompts (to prevent generation of overly long content)
 * - Form inputs (via maxLength attribute)
 */

export const FIELD_LIMITS = {
  // Campaign fields
  CAMPAIGN_NAME: 100,
  CAMPAIGN_DESCRIPTION: 2000,
  CAMPAIGN_RULESET: 50,
  CAMPAIGN_SETTING: 500,
  CAMPAIGN_HISTORY: 3000,
  CAMPAIGN_CURRENCY_NAME: 20,
  CAMPAIGN_CURRENCY_DESCRIPTION: 100,
  CAMPAIGN_PANTHEON: 2000,

  // Town fields
  TOWN_NAME: 100,
  TOWN_DESCRIPTION: 2000,
  TOWN_RULER: 200,
  TOWN_HISTORY: 3000,

  // Notable People fields
  NOTABLE_PERSON_NAME: 100,
  NOTABLE_PERSON_RACE: 50,
  NOTABLE_PERSON_BACKSTORY: 2000,
  NOTABLE_PERSON_MOTIVATION: 1000,

  // Shop fields
  SHOP_NAME: 100,
  SHOP_SLUG: 100,
  SHOP_LOCATION_DESCRIPTOR: 200,
  SHOP_KEEPER_NAME: 100,
  SHOP_KEEPER_RACE: 50,
  SHOP_KEEPER_BACKSTORY: 2000,
  SHOP_KEEPER_MOTIVATION: 1000,
  SHOP_OPERATING_HOURS: 100,

  // Item fields
  ITEM_NAME: 100,
  ITEM_DESCRIPTION: 2000,
  ITEM_HIDDEN_CONDITION: 500,

  // AI Generation
  AI_PROMPT: 1000,
  AI_FEEDBACK: 2000,
} as const

export type FieldLimitKey = keyof typeof FIELD_LIMITS
