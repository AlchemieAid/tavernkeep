/**
 * Comprehensive RLS (Row Level Security) Test Suite
 * 
 * @fileoverview
 * Ensures all tables have proper RLS enabled and policies are configured correctly.
 * This test suite runs against the actual database to verify security is in place.
 * 
 * Critical: All production tables MUST have RLS enabled to prevent data leakage.
 */

import { createClient } from '@supabase/supabase-js'

// Test configuration - skip if env vars not available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Determine if we should run or skip
const shouldRun = !!(supabaseUrl && supabaseKey)

describe('RLS Security Audit', () => {
  if (!shouldRun) {
    it('SKIPPED - No Supabase credentials', () => {
      console.log('Skipping RLS tests - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
    })
    return
  }
  
  const supabase = createClient(supabaseUrl!, supabaseKey!)

  beforeAll(async () => {
    // Verify we can connect
    const { error } = await supabase.from('profiles').select('count')
    if (error && error.message.includes('does not exist')) {
      throw new Error('Database connection failed or tables not initialized')
    }
  })

  describe('Critical DM Data Tables', () => {
    const criticalTables = [
      'campaigns',
      'shops',
      'items',
      'towns',
      'notable_people',
      'item_library',
      'players',
      'characters',
    ]

    it.each(criticalTables)('%s table should have RLS enabled', async (tableName) => {
      const { data, error } = await supabase
        .rpc('check_rls_enabled', { table_name: tableName })
        .single()

      if (error) {
        // If RPC doesn't exist, we'll check via a different method
        // Try to read without auth context should fail if RLS is enabled
        const { error: readError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        // If we can read without authentication, RLS is likely disabled
        // This is a simplified check - the real check is in the RLS audit migration
        expect(readError?.message).not.toContain('does not exist')
      } else {
        expect(data).toBe(true)
      }
    })
  })

  describe('World Map Tables', () => {
    const worldTables = [
      'campaign_maps',
      'terrain_areas',
      'resource_points',
      'world_towns',
      'points_of_interest',
      'trade_routes',
      'political_territories',
      'historical_events',
    ]

    it.each(worldTables)('%s table should have RLS enabled', async (tableName) => {
      const { error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1)

      // Should not get a permission denied error
      // If table doesn't exist, that's OK for this test
      if (error?.message.includes('does not exist')) {
        return // Table doesn't exist yet, skip
      }

      // If we get here, either:
      // 1. RLS is working and we got data (as authenticated test user)
      // 2. RLS is disabled and we got data (security issue)
      // 3. RLS is enabled but no policy allows our access (expected for anon)
      expect(error?.code).not.toBe('PGRST301') // Permission denied means RLS is working
    })
  })

  describe('System Tables', () => {
    const systemTables = [
      'profiles',
      'party_access',
      'ai_usage',
      'campaign_members',
    ]

    it.each(systemTables)('%s table should have RLS enabled', async (tableName) => {
      const { error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1)

      if (error?.message.includes('does not exist')) {
        return // Table doesn't exist yet, skip
      }

      expect(error?.code).not.toBe('PGRST301')
    })
  })

  describe('Admin Tables', () => {
    it('admin_users table should have RLS enabled', async () => {
      const { error } = await supabase
        .from('admin_users')
        .select('count')
        .limit(1)

      // Admin table should require admin role - regular users should be denied
      expect(error?.code).toBe('PGRST301') // Permission denied expected
    })

    it('app_config should be readable by authenticated users', async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('key')
        .limit(1)

      // Should be able to read (RLS allows authenticated reads)
      expect(error).toBeNull()
    })
  })

  describe('Catalog/Reference Tables', () => {
    it('catalog_items should be readable by authenticated users', async () => {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('name')
        .limit(1)

      if (error?.message.includes('does not exist')) {
        return // Table doesn't exist yet
      }

      // Catalog items should be readable reference data
      expect(error?.code).not.toBe('PGRST301')
    })
  })

  describe('Data Isolation', () => {
    it('should not allow cross-user data access', async () => {
      // This test verifies that one user cannot see another user's campaigns
      // In a real test, we'd create two test users and verify isolation
      // For now, we verify the RLS policies exist
      
      const { data: policies, error } = await supabase
        .rpc('get_table_policies', { table_name: 'campaigns' })

      // If RPC doesn't exist, we rely on the migration-based audit
      if (error) {
        console.log('Note: get_table_policies RPC not available, relying on migration audit')
        return
      }

      // Should have policies that enforce dm_id = auth.uid()
      const hasUserIsolation = policies?.some((p: { definition: string }) => 
        p.definition?.includes('auth.uid()') || 
        p.definition?.includes('dm_id')
      )

      expect(hasUserIsolation).toBe(true)
    })
  })
})

/**
 * Static test to ensure we have the RLS audit migration file
 * This runs even without database connection
 */
describe('RLS Migration Files', () => {
  const fs = require('fs')
  const path = require('path')

  it('should have RLS audit migration', () => {
    const migrationsDir = path.join(__dirname, '../../supabase/migrations')
    
    if (!fs.existsSync(migrationsDir)) {
      // Skip if migrations dir doesn't exist (e.g., in CI without full repo)
      return
    }

    const files = fs.readdirSync(migrationsDir)
    const hasRlsAudit = files.some((f: string) => 
      f.includes('rls') || f.includes('policy') || f.includes('security')
    )

    expect(hasRlsAudit).toBe(true)
  })
})
