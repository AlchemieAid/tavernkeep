/**
 * Multiplayer RLS Policy Tests
 *
 * Verifies that the access control model for the three principals
 * (DM / invited Player / Super Admin) is correctly reflected in
 * the live RLS policies.
 *
 * Strategy: use the get_table_policies() RPC to inspect policy
 * USING / WITH_CHECK expressions without needing real auth sessions.
 * This catches migration regressions without requiring test users.
 *
 * Principals & expected access:
 *   DM       — sees only their own dm_id-scoped content
 *   Player   — sees campaign content only for campaigns they've joined
 *              (via campaign_members), and only is_revealed rows
 *   SuperAdmin — behaves as a regular DM on the main site;
 *                admin panel uses service-role (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const hasCredentials = Boolean(supabaseUrl && supabaseAnonKey)

type Policy = { policyname: string; cmd: string; qual: string | null; with_check: string | null }

const supabase = hasCredentials
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

async function getPolicies(tableName: string): Promise<Policy[]> {
  const { data, error } = await supabase!.rpc('get_table_policies', { table_name: tableName })
  if (error) throw new Error(`get_table_policies(${tableName}): ${error.message}`)
  return (data ?? []) as Policy[]
}

const describeIf = hasCredentials ? describe : describe.skip

// ============================================================
// campaigns table
// ============================================================
describeIf('campaigns RLS — player access', () => {
  let policies: Policy[]

  beforeAll(async () => {
    policies = await getPolicies('campaigns')
  })

  it('DMs can only see their own campaigns (dm_id = auth.uid())', () => {
    const dmSelect = policies.filter(
      p => p.cmd === 'SELECT' && p.qual?.includes('dm_id') && p.qual?.includes('auth.uid()')
    )
    expect(dmSelect.length).toBeGreaterThanOrEqual(1)
  })

  it('Players can read campaigns they have joined', () => {
    const playerSelect = policies.find(
      p =>
        p.cmd === 'SELECT' &&
        p.qual?.includes('player_is_active_member')
    )
    expect(playerSelect).toBeDefined()
  })

  it('Player policy uses security-definer function (no inline recursion)', () => {
    const playerSelect = policies.find(
      p => p.cmd === 'SELECT' && p.qual?.includes('player_is_active_member')
    )
    // The qual should call the helper function, not embed a subquery that
    // would recurse through campaign_members → campaigns → campaign_members.
    expect(playerSelect?.qual).toBeDefined()
    expect(playerSelect?.qual).not.toContain('campaign_members')
  })

  it('No policy exposes campaigns to users with no membership (no USING true)', () => {
    const openSelect = policies.filter(
      p => p.cmd === 'SELECT' && p.qual?.trim() === 'true'
    )
    expect(openSelect).toHaveLength(0)
  })
})

// ============================================================
// players table
// ============================================================
describeIf('players RLS — DM party management access', () => {
  let policies: Policy[]

  beforeAll(async () => {
    policies = await getPolicies('players')
  })

  it('Players can read their own record (user_id = auth.uid())', () => {
    const selfRead = policies.find(
      p => p.cmd === 'SELECT' && p.qual?.includes('user_id') && p.qual?.includes('auth.uid()')
    )
    expect(selfRead).toBeDefined()
  })

  it('DMs can read players who are members of their campaigns', () => {
    const dmRead = policies.find(
      p =>
        p.cmd === 'SELECT' &&
        p.qual?.includes('dm_has_player_in_campaign')
    )
    expect(dmRead).toBeDefined()
  })

  it('DM player policy uses security-definer function (no inline recursion)', () => {
    const dmRead = policies.find(
      p => p.cmd === 'SELECT' && p.qual?.includes('dm_has_player_in_campaign')
    )
    // The qual should call the helper function, not embed a subquery that
    // would recurse through players → campaign_members → campaigns → campaigns.
    expect(dmRead?.qual).toBeDefined()
    expect(dmRead?.qual).not.toContain('campaign_members')
  })
})

// ============================================================
// admin_audit_log table
// ============================================================
describeIf('admin_audit_log RLS — no permissive INSERT', () => {
  let policies: Policy[]

  beforeAll(async () => {
    policies = await getPolicies('admin_audit_log')
  })

  it('Has no INSERT policy with WITH CHECK (true)', () => {
    const permissiveInsert = policies.filter(
      p => p.cmd === 'INSERT' && p.with_check?.trim() === 'true'
    )
    expect(permissiveInsert).toHaveLength(0)
  })

  it('Admins can read the audit log', () => {
    const adminRead = policies.find(p => p.cmd === 'SELECT')
    expect(adminRead).toBeDefined()
  })
})

// ============================================================
// party_access table
// ============================================================
describeIf('party_access RLS — no fully permissive UPDATE', () => {
  let policies: Policy[]

  beforeAll(async () => {
    policies = await getPolicies('party_access')
  })

  it('Has no UPDATE policy with USING (true)', () => {
    const permissiveUpdate = policies.filter(
      p => p.cmd === 'UPDATE' && p.qual?.trim() === 'true'
    )
    expect(permissiveUpdate).toHaveLength(0)
  })
})

// ============================================================
// Cross-campaign isolation: player access scoped per-campaign
// ============================================================
describeIf('Player content access is campaign-scoped', () => {
  it('towns player policy checks campaign_members AND is_revealed', async () => {
    const policies = await getPolicies('towns')
    const playerRead = policies.find(
      p => p.cmd === 'SELECT' && p.qual?.includes('campaign_members')
    )
    expect(playerRead).toBeDefined()
    expect(playerRead?.qual).toContain('is_revealed')
  })

  it('shops player policy checks campaign_members AND is_revealed', async () => {
    const policies = await getPolicies('shops')
    const playerRead = policies.find(
      p => p.cmd === 'SELECT' && p.qual?.includes('campaign_members')
    )
    expect(playerRead).toBeDefined()
    expect(playerRead?.qual).toContain('is_revealed')
  })

  it('items player policy checks campaign_members AND is_revealed', async () => {
    const policies = await getPolicies('items')
    const playerRead = policies.find(
      p => p.cmd === 'SELECT' && p.qual?.includes('campaign_members')
    )
    expect(playerRead).toBeDefined()
    expect(playerRead?.qual).toContain('is_revealed')
  })

  it('notable_people player policy checks campaign_members AND is_revealed', async () => {
    const policies = await getPolicies('notable_people')
    const playerRead = policies.find(
      p => p.cmd === 'SELECT' && p.qual?.includes('campaign_members')
    )
    expect(playerRead).toBeDefined()
    expect(playerRead?.qual).toContain('is_revealed')
  })
})

// ============================================================
// Super admin — no elevated RLS on DM-owned tables
// ============================================================
describeIf('Super admin has no elevated RLS on main-site DM tables', () => {
  const dmTables = ['campaigns', 'shops', 'towns', 'items', 'notable_people']

  it.each(dmTables)(
    '%s SELECT policies do not reference admin_users (no super-admin bypass)',
    async (tableName) => {
      const policies = await getPolicies(tableName)
      const adminBypass = policies.filter(
        p => p.cmd === 'SELECT' && p.qual?.includes('admin_users')
      )
      expect(adminBypass).toHaveLength(0)
    }
  )
})
