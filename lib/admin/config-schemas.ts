/**
 * Admin Config Schemas
 *
 * @fileoverview
 * Typed validation for every entry in the `app_config` table.
 *
 * Why:
 *   - The admin UI used to blindly parse JSON, allowing typos and
 *     wrong shapes to be saved (e.g. `{"maxRequests": "10"}` as a string).
 *   - Every consumer of `getConfig()` had its own ad-hoc default and
 *     no compile-time guarantee about the shape it would receive.
 *
 * How:
 *   - Each known key has a Zod schema and a "kind" hint that drives the
 *     UI widget (boolean toggle, number input, text input, JSON editor).
 *   - `validateConfigValue(key, value)` is the single chokepoint for
 *     writes. Unknown keys fall through with a permissive `z.unknown()`
 *     so the system stays open to extension.
 *
 * Adding a new config:
 *   1. Add a row to `app_config` (migration or the admin "create" flow).
 *   2. Add a schema entry below.
 *   3. Anything reading the value via `getConfig` should use the matching
 *      type from `ConfigValue<typeof KEY>`.
 */

import { z } from 'zod'

/**
 * UI widget hints. Drives which form control the admin sees.
 */
export type ConfigWidgetKind = 'boolean' | 'number' | 'string' | 'json'

interface ConfigSchemaEntry<T> {
  /** Zod schema for runtime validation. */
  schema: z.ZodType<T>
  /** UI widget hint. */
  kind: ConfigWidgetKind
  /** Default value used if the row is missing in the DB. */
  defaultValue: T
  /** Human-readable description shown alongside the editor. */
  description: string
}

/** Rate-limit shape used by `rate_limit_*` configs. */
const rateLimitSchema = z.object({
  maxRequests: z.number().int().positive(),
  windowMinutes: z.number().int().positive(),
})

/**
 * Curated config schemas.
 *
 * The keys MUST match the `key` column of `app_config`.
 */
export const CONFIG_SCHEMAS = {
  // --- Rate limits ---
  rate_limit_campaign: {
    schema: rateLimitSchema,
    kind: 'json',
    defaultValue: { maxRequests: 10, windowMinutes: 60 },
    description: 'Campaign generation rate limit',
  },
  rate_limit_town: {
    schema: rateLimitSchema,
    kind: 'json',
    defaultValue: { maxRequests: 50, windowMinutes: 60 },
    description: 'Town generation rate limit',
  },
  rate_limit_shop: {
    schema: rateLimitSchema,
    kind: 'json',
    defaultValue: { maxRequests: 100, windowMinutes: 60 },
    description: 'Shop generation rate limit',
  },
  rate_limit_item: {
    schema: rateLimitSchema,
    kind: 'json',
    defaultValue: { maxRequests: 200, windowMinutes: 60 },
    description: 'Item generation rate limit',
  },

  // --- Features ---
  feature_admin_panel: {
    schema: z.boolean(),
    kind: 'boolean',
    defaultValue: true,
    description: 'Enable admin panel access',
  },
  feature_ai_generation: {
    schema: z.boolean(),
    kind: 'boolean',
    defaultValue: true,
    description: 'Enable AI generation features',
  },
  feature_hierarchical_gen: {
    schema: z.boolean(),
    kind: 'boolean',
    defaultValue: true,
    description: 'Enable full campaign hierarchy generation',
  },
  feature_public_shops: {
    schema: z.boolean(),
    kind: 'boolean',
    defaultValue: true,
    description: 'Enable public shop QR codes and access',
  },
  feature_shopping_cart: {
    schema: z.boolean(),
    kind: 'boolean',
    defaultValue: true,
    description: 'Enable player shopping cart functionality',
  },

  // --- AI ---
  ai_max_retries: {
    schema: z.number().int().min(0).max(10),
    kind: 'number',
    defaultValue: 3,
    description: 'Maximum retry attempts for AI calls',
  },
  ai_model_default: {
    schema: z.string().min(1).max(64),
    kind: 'string',
    defaultValue: 'gpt-4o',
    description: 'Default model identifier for AI generation',
  },
  ai_temperature: {
    schema: z.number().min(0).max(2),
    kind: 'number',
    defaultValue: 0.7,
    description: 'AI creativity temperature (0.0–2.0)',
  },
  ai_timeout_ms: {
    schema: z.number().int().min(1_000).max(600_000),
    kind: 'number',
    defaultValue: 30_000,
    description: 'AI request timeout in milliseconds',
  },

  // --- Terrain ---
  terrain_water_river_half_width: {
    schema: z.number().int().min(1).max(20),
    kind: 'number',
    defaultValue: 5,
    description: 'Water pixel depth threshold for river vs ocean/lake (1–20). Lower = only narrower features become rivers. Raise if rivers are missed; lower if ocean bleeds into river polygons.',
  },
  terrain_water_min_thin_pixels: {
    schema: z.number().int().min(5).max(200),
    kind: 'number',
    defaultValue: 15,
    description: 'Minimum pixel count for a thin water component (river/coast) to be stored (5–200). Lower captures shorter river stubs; raise to suppress noise.',
  },
  terrain_water_rdp_epsilon: {
    schema: z.number().min(0.5).max(10),
    kind: 'number',
    defaultValue: 3.0,
    description: 'Ramer-Douglas-Peucker polygon simplification tolerance (0.5–10). Lower = smoother, more vertices. Raise = blockier but faster.',
  },

  // --- System ---
  system_cache_ttl_seconds: {
    schema: z.number().int().min(1).max(86_400),
    kind: 'number',
    defaultValue: 300,
    description: 'Config cache TTL in seconds',
  },
  system_maintenance_mode: {
    schema: z.boolean(),
    kind: 'boolean',
    defaultValue: false,
    description: 'Enable maintenance mode (disables all generation)',
  },
} as const satisfies Record<string, ConfigSchemaEntry<unknown>>

/**
 * Strongly-typed key union for known configs.
 */
export type KnownConfigKey = keyof typeof CONFIG_SCHEMAS

/**
 * Helper to extract the typed value for a known config key.
 */
export type ConfigValue<K extends KnownConfigKey> =
  z.infer<(typeof CONFIG_SCHEMAS)[K]['schema']>

/**
 * Validate a value against a key's schema.
 *
 * @returns `{ success: true, value }` on success,
 *          `{ success: false, error }` on validation failure.
 *
 * Unknown keys are accepted with the value as-is (open to extension).
 */
export function validateConfigValue(
  key: string,
  value: unknown
):
  | { success: true; value: unknown }
  | { success: false; error: string } {
  const entry = (CONFIG_SCHEMAS as Record<string, ConfigSchemaEntry<unknown>>)[key]
  if (!entry) {
    // Unknown key — accept as-is. Tracked via tests + audit log.
    return { success: true, value }
  }
  const parsed = entry.schema.safeParse(value)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.length ? ` at ${issue.path.join('.')}` : ''
    return {
      success: false,
      error: `${issue?.message ?? 'Invalid value'}${path}`,
    }
  }
  return { success: true, value: parsed.data }
}

/**
 * Lookup the UI widget kind for a config key.
 * Unknown keys fall back to `'json'`.
 */
export function getConfigWidgetKind(key: string): ConfigWidgetKind {
  return (
    (CONFIG_SCHEMAS as Record<string, ConfigSchemaEntry<unknown>>)[key]?.kind
    ?? 'json'
  )
}

/**
 * Strongly-typed default lookup. Falls back to the supplied default for
 * unknown keys.
 */
export function getConfigDefault<T>(key: string, fallback: T): T {
  const entry = (CONFIG_SCHEMAS as Record<string, ConfigSchemaEntry<unknown>>)[key]
  return (entry?.defaultValue as T | undefined) ?? fallback
}
