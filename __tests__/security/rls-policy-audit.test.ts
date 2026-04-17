/**
 * RLS Policy Security Audit Tests
 * 
 * @fileoverview
 * Automated tests that verify RLS policies are configured correctly.
 * Does NOT require test users - just checks policy definitions.
 * 
 * These tests catch dangerous patterns like:
 * - IS NOT NULL as security condition (our shop/campaign bugs)
 * - Always-true conditions (true, 1=1, NOT false)
 * - Missing auth.uid() checks on DM-owned tables
 * 
 * @see TESTING_STRATEGY.md for full testing approach
 * 
 * @example
 * ```bash
 * npm run test:rls-audit
 * ```
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface PolicyRow {
  schemaname?: string
  tablename: string
  policyname: string
  cmd: string
  qual: string | null
  with_check: string | null
  issue?: string
}

interface SecurityCheck {
  tablename: string
  has_select_policy: boolean
  has_auth_check: boolean
  has_dm_id_check: boolean
  status: string
}

describe('RLS Policy Security Audit', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  })

  describe('Dangerous Policy Patterns', () => {
    it('should not have any policies with dangerous patterns', async () => {
      // @ts-expect-error - RPC function exists in database but not in types
      const { data, error } = await supabase.rpc('get_dangerous_policies')
      const dangerousPolicies = (data as unknown as PolicyRow[]) || []

      expect(error).toBeNull()
      
      if (dangerousPolicies.length > 0) {
        console.error('❌ Dangerous policies found:')
        dangerousPolicies.forEach((p) => {
          console.error(`  - ${p.tablename}.${p.policyname}: ${p.issue}`)
          console.error(`    Condition: ${p.qual}`)
        })
      }

      expect(dangerousPolicies).toHaveLength(0)
    })

    it('should not have policies using IS NOT NULL as security condition', async () => {
      const { data } = await supabase.rpc('get_all_policies')
      const policies = (data as unknown as PolicyRow[]) || []
      
      const isNotNullPolicies = policies.filter((p) => 
        p.qual?.includes('IS NOT NULL')
      )

      if (isNotNullPolicies.length > 0) {
        console.error('❌ Policies using IS NOT NULL:')
        isNotNullPolicies.forEach((p) => {
          console.error(`  - ${p.tablename}.${p.policyname}`)
          console.error(`    Condition: ${p.qual}`)
        })
      }

      expect(isNotNullPolicies).toHaveLength(0)
    })

    it('should not have policies that always allow access', async () => {
      const { data } = await supabase.rpc('get_all_policies')
      const policies = (data as unknown as PolicyRow[]) || []
      
      const alwaysTruePolicies = policies.filter((p) => 
        p.qual === 'true' || 
        p.qual?.includes('1=1') ||
        p.qual?.includes('NOT (false)')
      )

      if (alwaysTruePolicies.length > 0) {
        console.error('❌ Policies that always allow access:')
        alwaysTruePolicies.forEach((p) => {
          console.error(`  - ${p.tablename}.${p.policyname}`)
          console.error(`    Condition: ${p.qual}`)
        })
      }

      expect(alwaysTruePolicies).toHaveLength(0)
    })
  })

  describe('DM-Owned Tables Security', () => {
    it('should verify all DM-owned tables have proper security', async () => {
      const { data, error } = await supabase
        .rpc('verify_dm_table_security')
      const results = (data as unknown as SecurityCheck[]) || []

      expect(error).toBeNull()
      expect(results).toBeDefined()

      const failures = results.filter((r) => r.status !== 'OK')

      if (failures.length > 0) {
        console.error('❌ Security issues found:')
        failures.forEach((f: any) => {
          console.error(`  - ${f.tablename}: ${f.status}`)
          console.error(`    Has SELECT policy: ${f.has_select_policy}`)
          console.error(`    Has auth.uid() check: ${f.has_auth_check}`)
          console.error(`    Has dm_id check: ${f.has_dm_id_check}`)
        })
      }

      expect(failures).toHaveLength(0)
    })

    const dmTables = ['campaigns', 'towns', 'shops', 'notable_people', 'item_library']

    dmTables.forEach(table => {
      describe(`${table} table`, () => {
        it('should have at least one SELECT policy', async () => {
          const { data } = await supabase
            .rpc('get_table_policies', { table_name: table })
          const policies = (data as unknown as PolicyRow[]) || []

          const selectPolicies = policies.filter((p) => p.cmd === 'SELECT')
          expect(selectPolicies.length).toBeGreaterThan(0)
        })

        it('should have auth.uid() check in SELECT policies', async () => {
          const { data } = await supabase
            .rpc('get_table_policies', { table_name: table })
          const policies = (data as unknown as PolicyRow[]) || []

          const selectPolicies = policies.filter((p: unknown) => (p as PolicyRow).cmd === 'SELECT')
          const hasAuthCheck = selectPolicies.some((p: unknown) => 
            (p as PolicyRow).qual?.includes('auth.uid()')
          )

          if (!hasAuthCheck) {
            console.error(`❌ ${table} SELECT policies:`)
            selectPolicies.forEach((p: unknown) => {
              console.error(`  - ${(p as PolicyRow).policyname}: ${(p as PolicyRow).qual}`)
            })
          }

          expect(hasAuthCheck).toBe(true)
        })

        it('should have dm_id check in SELECT policies', async () => {
          const { data } = await supabase
            .rpc('get_table_policies', { table_name: table })
          const policies = (data as unknown as PolicyRow[]) || []

          const selectPolicies = policies.filter((p: unknown) => (p as PolicyRow).cmd === 'SELECT')
          const hasDmIdCheck = selectPolicies.some((p: unknown) => 
            (p as PolicyRow).qual?.includes('dm_id') || (p as PolicyRow).qual?.includes('= dm_id')
          )

          if (!hasDmIdCheck) {
            console.error(`❌ ${table} SELECT policies missing dm_id check:`)
            selectPolicies.forEach((p: unknown) => {
              console.error(`  - ${(p as PolicyRow).policyname}: ${(p as PolicyRow).qual}`)
            })
          }

          expect(hasDmIdCheck).toBe(true)
        })

        it('should have INSERT policy with dm_id check', async () => {
          const { data: policies } = await supabase
            .rpc('get_table_policies', { table_name: table })

          const insertPolicies = policies?.filter((p: unknown) => (p as PolicyRow).cmd === 'INSERT') || []
          expect(insertPolicies.length).toBeGreaterThan(0)

          const hasAuthCheck = insertPolicies.some((p: unknown) => 
            (p as PolicyRow).with_check?.includes('auth.uid()') && 
            (p as PolicyRow).with_check?.includes('dm_id')
          )

          expect(hasAuthCheck).toBe(true)
        })

        it('should have UPDATE policy with dm_id check', async () => {
          const { data: policies } = await supabase
            .rpc('get_table_policies', { table_name: table })

          const updatePolicies = policies?.filter((p: unknown) => (p as PolicyRow).cmd === 'UPDATE') || []
          expect(updatePolicies.length).toBeGreaterThan(0)

          const hasAuthCheck = updatePolicies.some((p: unknown) => 
            (p as PolicyRow).qual?.includes('auth.uid()') && (p as PolicyRow).qual?.includes('dm_id')
          )

          expect(hasAuthCheck).toBe(true)
        })

        it('should have DELETE policy with dm_id check', async () => {
          const { data: policies } = await supabase
            .rpc('get_table_policies', { table_name: table })

          const deletePolicies = policies?.filter((p: unknown) => (p as PolicyRow).cmd === 'DELETE') || []
          expect(deletePolicies.length).toBeGreaterThan(0)

          const hasAuthCheck = deletePolicies.some((p: unknown) => 
            (p as PolicyRow).qual?.includes('auth.uid()') && (p as PolicyRow).qual?.includes('dm_id')
          )

          expect(hasAuthCheck).toBe(true)
        })
      })
    })
  })

  describe('Public Access Policies', () => {
    it('shops public access should require is_public flag', async () => {
      const { data } = await supabase
        .rpc('get_table_policies', { table_name: 'shops' })
      const policies = (data as unknown as PolicyRow[]) || []

      const publicPolicies = policies.filter((p) => 
        p.policyname?.toLowerCase().includes('public')
      )

      publicPolicies.forEach((p) => {
        expect(p.qual).toContain('is_public')
        expect(p.qual).toContain('is_active')
      })
    })
  })

  describe('Policy Coverage', () => {
    it('should have RLS enabled on all DM-owned tables', async () => {
      const { data } = await supabase.rpc('get_all_policies')
      const policies = (data as unknown as PolicyRow[]) || []
      
      const dmTables = ['campaigns', 'towns', 'shops', 'notable_people', 'item_library']
      const tablesWithPolicies = new Set(policies.map((p) => p.tablename))

      dmTables.forEach(table => {
        expect(tablesWithPolicies.has(table)).toBe(true)
      })
    })

    it('should have all CRUD policies for DM-owned tables', async () => {
      const dmTables = ['campaigns', 'towns', 'shops', 'notable_people', 'item_library']
      const requiredCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']

      for (const table of dmTables) {
        const { data } = await supabase
          .rpc('get_table_policies', { table_name: table })
        const policies = (data as unknown as PolicyRow[]) || []

        const commands = new Set(policies.map((p) => p.cmd))

        requiredCommands.forEach(cmd => {
          expect(commands.has(cmd)).toBe(true)
        })
      }
    })
  })
})
