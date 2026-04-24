/**
 * Schema Registry Tests
 *
 * Verifies that the curated table registry stays consistent and that
 * fallback resolution behaves predictably for unknown tables.
 */
import { describe, it, expect } from '@jest/globals'
import {
  TABLE_REGISTRY,
  resolveTableMetadata,
  getTableMetadata,
  groupByCategory,
  type TableMetadata,
} from '@/lib/admin/schema-registry'

describe('schema-registry', () => {
  describe('TABLE_REGISTRY', () => {
    it('uses each key as the table name', () => {
      for (const [key, meta] of Object.entries(TABLE_REGISTRY)) {
        expect(meta.name).toBe(key)
      }
    })

    it('every entry has a category, label, icon', () => {
      for (const meta of Object.values(TABLE_REGISTRY)) {
        expect(meta.category).toBeTruthy()
        expect(meta.label).toBeTruthy()
        expect(meta.icon).toBeTruthy()
      }
    })

    it('table names use only safe identifier characters', () => {
      for (const name of Object.keys(TABLE_REGISTRY)) {
        expect(name).toMatch(/^[a-z_][a-z0-9_]*$/)
      }
    })

    it('covers the critical admin / commerce / world tables', () => {
      const required = [
        'campaigns', 'towns', 'shops', 'items', 'item_library',
        'notable_people', 'app_config', 'admin_users', 'admin_audit_log',
      ]
      for (const name of required) {
        expect(TABLE_REGISTRY[name]).toBeDefined()
      }
    })
  })

  describe('resolveTableMetadata', () => {
    it('returns curated metadata for known tables', () => {
      const meta = resolveTableMetadata('campaigns')
      expect(meta).not.toBeNull()
      expect(meta?.label).toBe('Campaigns')
      expect(meta?.timestampColumn).toBe('created_at')
    })

    it('falls back to defaults for unknown tables', () => {
      const meta = resolveTableMetadata('newly_added_table')
      expect(meta).not.toBeNull()
      expect(meta?.category).toBe('Other')
      expect(meta?.label).toBe('Newly Added Table')
      expect(meta?.timestampColumn).toBeNull()
    })

    it('detects timestamp columns from auto-discovered columns', () => {
      const meta = resolveTableMetadata('made_up_table', ['id', 'updated_at', 'name'])
      expect(meta?.timestampColumn).toBe('updated_at')
    })

    it('returns null for hidden tables', () => {
      expect(resolveTableMetadata('schema_migrations')).toBeNull()
    })
  })

  describe('getTableMetadata', () => {
    it('returns null for unknown tables (no fallback)', () => {
      expect(getTableMetadata('definitely_not_a_table')).toBeNull()
    })
  })

  describe('groupByCategory', () => {
    it('groups every category and preserves entries', () => {
      const tables = Object.values(TABLE_REGISTRY) as TableMetadata[]
      const grouped = groupByCategory(tables)
      const total = Object.values(grouped).reduce((acc, l) => acc + l.length, 0)
      expect(total).toBe(tables.length)
    })
  })
})
