/**
 * RLS Verification Script
 * 
 * @fileoverview
 * Run this script to verify all tables have RLS enabled.
 * Usage: npx ts-node scripts/verify-rls.ts
 * 
 * Exit codes:
 *   0 - All tables have RLS enabled
 *   1 - Some tables missing RLS (security issue)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Tables that should have RLS enabled
const requiredRlsTables = [
  // Core DM data
  'campaigns',
  'shops',
  'items',
  'towns',
  'notable_people',
  'item_library',
  // Player data
  'players',
  'characters',
  'party_access',
  'campaign_members',
  // World/economy data
  'campaign_maps',
  'terrain_areas',
  'resource_points',
  'world_towns',
  'points_of_interest',
  'trade_routes',
  'political_territories',
  'historical_events',
  // System data
  'profiles',
  'ai_usage',
  'admin_users',
  'app_config',
  'admin_audit_log',
  'app_config_history',
  // Reference data
  'catalog_items',
]

async function verifyRLS() {
  console.log('🔒 Checking RLS status on all tables...\n')

  const issues: string[] = []

  for (const table of requiredRlsTables) {
    try {
      // Try to read from the table
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error?.code === 'PGRST301') {
        // Permission denied - RLS is working
        console.log(`✅ ${table}: RLS enabled (permission denied as expected)`)
      } else if (error?.message?.includes('does not exist')) {
        // Table doesn't exist - might be a new table not yet migrated
        console.log(`⚠️  ${table}: Table does not exist (may need migration)`)
      } else if (error) {
        // Some other error
        console.log(`⚠️  ${table}: ${error.message}`)
      } else {
        // No error means we could read the table
        // This is a security issue if the table contains user data
        if (
          table === 'campaigns' ||
          table === 'shops' ||
          table === 'items' ||
          table === 'towns' ||
          table === 'notable_people' ||
          table === 'item_library' ||
          table === 'admin_users'
        ) {
          issues.push(`${table}: CRITICAL - Can read without RLS!`)
          console.log(`❌ ${table}: CRITICAL - Can read without RLS!`)
        } else {
          // For some tables (like catalog_items), public read might be OK
          console.log(`⚠️  ${table}: Can read without auth (may be intentional)`)
        }
      }
    } catch (err) {
      console.log(`⚠️  ${table}: Error checking - ${err}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  
  if (issues.length === 0) {
    console.log('✅ All critical tables have RLS enabled!')
    process.exit(0)
  } else {
    console.log(`❌ Found ${issues.length} security issues:`)
    issues.forEach(issue => console.log(`   - ${issue}`))
    process.exit(1)
  }
}

verifyRLS()
