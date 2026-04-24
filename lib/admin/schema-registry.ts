/**
 * Admin Schema Registry
 *
 * @fileoverview
 * Single source of truth for tables visible in the admin data browser.
 *
 * Two layers:
 *   1. **Curated registry** (`TABLE_REGISTRY`) — humans curate label, icon,
 *      category, sensitivity, and the timestamp column used for ordering.
 *   2. **Auto-discovery** (`discoverTables`) — at runtime we ask Postgres
 *      `information_schema.tables` for the rest of `public.*`. New tables
 *      created via migration appear automatically with a sensible default,
 *      so the admin UI never silently goes stale.
 *
 * The registry is the place to add new tables intentionally. Auto-discovery
 * is a safety net so we don't lose visibility on day one of a new feature.
 *
 * @scalability
 * Adding a new table to the admin browser:
 *   - Either: do nothing (it appears automatically with defaults), or
 *   - Add an entry in TABLE_REGISTRY for a curated label/icon/category.
 */

import { createAdminClient } from './supabase-admin'

/** Logical grouping of tables in the data browser sidebar. */
export type TableCategory =
  | 'Campaigns'
  | 'World'
  | 'Commerce'
  | 'Players'
  | 'AI'
  | 'Admin'
  | 'Other'

export interface TableMetadata {
  /** Postgres table name in `public` schema. */
  name: string
  /** Human-readable label shown in the UI. */
  label: string
  /** Emoji or short token rendered next to the label. */
  icon: string
  /** Sidebar grouping. */
  category: TableCategory
  /** Column used to ORDER BY when listing rows; null = no ordering. */
  timestampColumn: string | null
  /**
   * `true` when rows contain sensitive PII (auth IDs, IPs, etc.).
   * Surfaced in the UI as a warning; does not block reads.
   */
  sensitive?: boolean
  /**
   * Optional short description shown as a tooltip / subtitle.
   */
  description?: string
}

/**
 * Curated table registry.
 *
 * Order here is preserved in the sidebar (within each category).
 * Adding a new table? Insert it under the right category.
 */
export const TABLE_REGISTRY: Record<string, TableMetadata> = {
  // --- Campaigns ---
  campaigns: {
    name: 'campaigns',
    label: 'Campaigns',
    icon: '🎲',
    category: 'Campaigns',
    timestampColumn: 'created_at',
    description: 'DM-owned campaigns',
  },
  campaign_members: {
    name: 'campaign_members',
    label: 'Campaign Members',
    icon: '🤝',
    category: 'Campaigns',
    timestampColumn: 'joined_at',
  },
  party_access: {
    name: 'party_access',
    label: 'Party Access',
    icon: '🔑',
    category: 'Campaigns',
    timestampColumn: 'last_seen_at',
  },

  // --- World ---
  towns: {
    name: 'towns',
    label: 'Towns',
    icon: '🏘️',
    category: 'World',
    timestampColumn: 'created_at',
  },
  notable_people: {
    name: 'notable_people',
    label: 'Notable People',
    icon: '👤',
    category: 'World',
    timestampColumn: 'created_at',
  },
  campaign_maps: {
    name: 'campaign_maps',
    label: 'Campaign Maps',
    icon: '🗺️',
    category: 'World',
    timestampColumn: 'created_at',
  },
  terrain_areas: {
    name: 'terrain_areas',
    label: 'Terrain Areas',
    icon: '⛰️',
    category: 'World',
    timestampColumn: 'created_at',
  },
  resource_points: {
    name: 'resource_points',
    label: 'Resource Points',
    icon: '💎',
    category: 'World',
    timestampColumn: 'created_at',
  },
  world_towns: {
    name: 'world_towns',
    label: 'World Towns',
    icon: '🏰',
    category: 'World',
    timestampColumn: 'created_at',
  },
  points_of_interest: {
    name: 'points_of_interest',
    label: 'Points of Interest',
    icon: '📍',
    category: 'World',
    timestampColumn: 'created_at',
  },
  trade_routes: {
    name: 'trade_routes',
    label: 'Trade Routes',
    icon: '🛤️',
    category: 'World',
    timestampColumn: 'created_at',
  },
  political_territories: {
    name: 'political_territories',
    label: 'Political Territories',
    icon: '🏳️',
    category: 'World',
    timestampColumn: 'created_at',
  },
  historical_events: {
    name: 'historical_events',
    label: 'Historical Events',
    icon: '📜',
    category: 'World',
    timestampColumn: 'created_at',
  },

  // --- Commerce ---
  shops: {
    name: 'shops',
    label: 'Shops',
    icon: '🏪',
    category: 'Commerce',
    timestampColumn: 'created_at',
  },
  items: {
    name: 'items',
    label: 'Shop Items',
    icon: '⚔️',
    category: 'Commerce',
    timestampColumn: 'added_at',
  },
  item_library: {
    name: 'item_library',
    label: 'Item Library',
    icon: '📚',
    category: 'Commerce',
    timestampColumn: 'created_at',
  },
  catalog_items: {
    name: 'catalog_items',
    label: 'SRD Catalog',
    icon: '📖',
    category: 'Commerce',
    timestampColumn: 'created_at',
  },
  cart_items: {
    name: 'cart_items',
    label: 'Cart Items',
    icon: '🛒',
    category: 'Commerce',
    timestampColumn: 'added_at',
  },

  // --- Players ---
  characters: {
    name: 'characters',
    label: 'Characters',
    icon: '🧙',
    category: 'Players',
    timestampColumn: 'created_at',
  },
  players: {
    name: 'players',
    label: 'Players',
    icon: '🎮',
    category: 'Players',
    timestampColumn: 'created_at',
    sensitive: true,
  },
  profiles: {
    name: 'profiles',
    label: 'Profiles',
    icon: '👥',
    category: 'Players',
    timestampColumn: 'created_at',
    sensitive: true,
  },

  // --- AI ---
  ai_usage: {
    name: 'ai_usage',
    label: 'AI Usage',
    icon: '🤖',
    category: 'AI',
    timestampColumn: 'created_at',
  },
  usage_logs: {
    name: 'usage_logs',
    label: 'Usage Logs',
    icon: '📊',
    category: 'AI',
    timestampColumn: 'created_at',
  },
  ai_cache: {
    name: 'ai_cache',
    label: 'AI Cache',
    icon: '💾',
    category: 'AI',
    timestampColumn: 'created_at',
  },

  // --- Admin ---
  app_config: {
    name: 'app_config',
    label: 'App Config',
    icon: '⚙️',
    category: 'Admin',
    timestampColumn: 'created_at',
  },
  app_config_history: {
    name: 'app_config_history',
    label: 'Config History',
    icon: '📈',
    category: 'Admin',
    timestampColumn: 'created_at',
  },
  admin_users: {
    name: 'admin_users',
    label: 'Admin Users',
    icon: '👑',
    category: 'Admin',
    timestampColumn: 'granted_at',
    sensitive: true,
  },
  admin_audit_log: {
    name: 'admin_audit_log',
    label: 'Audit Log',
    icon: '📝',
    category: 'Admin',
    timestampColumn: 'created_at',
    sensitive: true,
  },
}

/**
 * Tables that exist in the database but should never be exposed in the
 * admin browser (e.g. Supabase internal tables, future tables we have
 * decided to keep hidden).
 */
const HIDDEN_TABLES = new Set<string>([
  'schema_migrations',
])

/** Common timestamp columns we probe for auto-discovery, in priority order. */
const COMMON_TIMESTAMP_COLUMNS = [
  'created_at',
  'updated_at',
  'added_at',
  'joined_at',
  'granted_at',
  'last_seen_at',
] as const

/**
 * Get curated metadata for a table.
 *
 * @returns Metadata if the table is registered, otherwise null.
 */
export function getTableMetadata(tableName: string): TableMetadata | null {
  return TABLE_REGISTRY[tableName] ?? null
}

/**
 * Get metadata for a table, falling back to sensible defaults for
 * tables not yet curated. Returns null only for actively hidden tables.
 */
export function resolveTableMetadata(
  tableName: string,
  discoveredColumns?: string[]
): TableMetadata | null {
  if (HIDDEN_TABLES.has(tableName)) return null
  const curated = TABLE_REGISTRY[tableName]
  if (curated) return curated

  // Auto-discovered fallback: pick the first matching common column.
  let timestampColumn: string | null = null
  if (discoveredColumns) {
    timestampColumn =
      COMMON_TIMESTAMP_COLUMNS.find(c => discoveredColumns.includes(c)) ?? null
  }

  return {
    name: tableName,
    label: tableName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()),
    icon: '🗄️',
    category: 'Other',
    timestampColumn,
    description: 'Auto-discovered (add to TABLE_REGISTRY for curation)',
  }
}

/**
 * Discover tables in the public schema and merge with the curated registry.
 *
 * @returns Array of TableMetadata, in curated order followed by auto-discovered.
 *
 * @description
 * Calls the Postgres function `admin_list_public_tables()` (defined in
 * migration `20260424120000_admin_list_tables.sql`). The function returns
 * `(table_name text)` for every base table in the `public` schema.
 *
 * Falls back to the curated registry if the RPC is unavailable (e.g. the
 * migration has not yet run, or the service role key is missing).
 */
export async function discoverTables(): Promise<TableMetadata[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await (admin.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)('admin_list_public_tables')

    if (error || !Array.isArray(data)) {
      return Object.values(TABLE_REGISTRY).filter(t => !HIDDEN_TABLES.has(t.name))
    }

    const discoveredNames = new Set<string>(
      (data as Array<{ table_name: string }>).map(t => t.table_name)
    )

    const merged: TableMetadata[] = []
    const seen = new Set<string>()

    // Curated tables first (preserves human-chosen order within categories).
    // Only include curated entries that still exist in the database.
    for (const meta of Object.values(TABLE_REGISTRY)) {
      if (HIDDEN_TABLES.has(meta.name)) continue
      if (discoveredNames.has(meta.name)) {
        merged.push(meta)
        seen.add(meta.name)
      }
    }

    // Then any auto-discovered tables not yet in the registry.
    for (const tableName of discoveredNames) {
      if (seen.has(tableName)) continue
      if (HIDDEN_TABLES.has(tableName)) continue
      const meta = resolveTableMetadata(tableName)
      if (meta) merged.push(meta)
    }

    return merged
  } catch {
    // Discovery failure should never break the page
    return Object.values(TABLE_REGISTRY).filter(t => !HIDDEN_TABLES.has(t.name))
  }
}

/**
 * Group tables by category for UI rendering.
 */
export function groupByCategory(
  tables: TableMetadata[]
): Record<TableCategory, TableMetadata[]> {
  const groups = {
    Campaigns: [],
    World: [],
    Commerce: [],
    Players: [],
    AI: [],
    Admin: [],
    Other: [],
  } as Record<TableCategory, TableMetadata[]>

  for (const table of tables) {
    groups[table.category].push(table)
  }
  return groups
}
