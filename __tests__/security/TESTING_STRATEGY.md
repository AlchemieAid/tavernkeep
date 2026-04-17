# Security Testing Strategy

## Overview

We need **two complementary approaches** to prevent RLS policy leakage:

1. **Automated RLS Policy Tests** - Generic scripts that verify policies are correct
2. **Integration Tests with Real Users** - Test actual data access with multiple users

---

## Approach 1: Automated RLS Policy Tests (Recommended First)

### ✅ Advantages
- No test users needed
- Fast to run (< 1 second)
- Can run in CI/CD pipeline
- Catches policy misconfigurations immediately
- No database state required

### 📝 What to Test

**Check for dangerous policy patterns:**
```typescript
// Check for overly permissive policies
const dangerousPatterns = [
  'IS NOT NULL',           // Like our shop/campaign bugs
  'true',                  // Allows everything
  '1=1',                   // Always true
  'NOT (false)',           // Always true
]

// Verify all DM-owned tables have dm_id checks
const dmOwnedTables = [
  'campaigns',
  'towns', 
  'shops',
  'notable_people',
  'item_library'
]

// Each should have policies like:
// USING (auth.uid() = dm_id)
```

### 🔧 Implementation

Create: `__tests__/security/rls-policy-audit.test.ts`

```typescript
/**
 * RLS Policy Audit Tests
 * 
 * Verifies that all tables have correct RLS policies.
 * Does NOT require test users - just checks policy definitions.
 */

describe('RLS Policy Audit', () => {
  it('should not have any overly permissive policies', async () => {
    const { data: policies } = await supabase.rpc('get_all_policies')
    
    const dangerous = policies.filter(p => 
      p.qual?.includes('IS NOT NULL') ||
      p.qual === 'true' ||
      p.qual?.includes('1=1')
    )
    
    expect(dangerous).toHaveLength(0)
  })
  
  it('should enforce dm_id checks on all DM-owned tables', async () => {
    const dmTables = ['campaigns', 'towns', 'shops', 'notable_people', 'item_library']
    
    for (const table of dmTables) {
      const { data: policies } = await supabase
        .rpc('get_table_policies', { table_name: table })
      
      const selectPolicies = policies.filter(p => p.cmd === 'SELECT')
      const hasDmIdCheck = selectPolicies.some(p => 
        p.qual?.includes('auth.uid()') && p.qual?.includes('dm_id')
      )
      
      expect(hasDmIdCheck).toBe(true)
    }
  })
})
```

---

## Approach 2: Integration Tests with Test Users (Recommended Second)

### ✅ Advantages
- Tests actual data access (not just policy definitions)
- Catches edge cases and join leakage
- Verifies end-to-end security
- Tests real-world scenarios

### ❌ Disadvantages
- Requires test user setup
- Slower to run (network calls)
- Harder to maintain
- Can't run without database access

### 📝 What to Test

**Test actual data isolation:**
```typescript
// 1. Create two test DMs
// 2. Each creates their own data
// 3. Verify DM1 cannot see DM2's data
// 4. Verify DM1 cannot modify DM2's data
// 5. Verify joins don't leak data
```

### 🔧 Implementation

We already have the template: `__tests__/security/data-isolation.test.ts`

**But it's currently skipped because we need test users.**

---

## Recommended Implementation Plan

### Phase 1: Automated Policy Tests (Do This First) ⭐

**Why:** Fast, no setup required, catches 90% of issues

**Steps:**
1. Create SQL function to query `pg_policies`
2. Write Jest tests that check policy patterns
3. Run in CI/CD before every deployment
4. Takes < 1 second to run

**Files to create:**
- `supabase/migrations/20260417130000_add_policy_audit_functions.sql`
- `__tests__/security/rls-policy-audit.test.ts`

### Phase 2: Test User Setup (Do This Later)

**Why:** Comprehensive, but requires infrastructure

**Steps:**
1. Create test users via Supabase Auth Admin API
2. Seed test data for each user
3. Enable `data-isolation.test.ts`
4. Run before major releases

**Files to create:**
- `scripts/setup-test-users.ts`
- `scripts/seed-test-data.ts`
- Update `__tests__/security/data-isolation.test.ts`

---

## Quick Win: SQL-Based Policy Audit

You can run this **right now** without any test users:

```sql
-- Check for dangerous policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    qual LIKE '%IS NOT NULL%' 
    OR qual = 'true'
    OR qual LIKE '%1=1%'
  );

-- Should return 0 rows ✅

-- Verify DM-owned tables have auth.uid() checks
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('campaigns', 'towns', 'shops', 'notable_people', 'item_library')
  AND cmd = 'SELECT'
  AND qual NOT LIKE '%auth.uid()%';

-- Should return 0 rows ✅
```

---

## My Recommendation

### Start with Automated Policy Tests

**Create this file now:**

`__tests__/security/rls-policy-audit.test.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

describe('RLS Policy Security Audit', () => {
  let supabase: any

  beforeAll(async () => {
    supabase = await createClient()
  })

  describe('Dangerous Policy Patterns', () => {
    it('should not have policies with IS NOT NULL as security condition', async () => {
      const { data: policies } = await supabase
        .rpc('get_dangerous_policies')
      
      expect(policies).toHaveLength(0)
    })
  })

  describe('DM-Owned Tables', () => {
    const dmTables = ['campaigns', 'towns', 'shops', 'notable_people', 'item_library']

    dmTables.forEach(table => {
      it(`${table} should have dm_id-based SELECT policy`, async () => {
        const { data: policies } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('tablename', table)
          .eq('cmd', 'SELECT')
        
        const hasDmIdCheck = policies.some((p: any) => 
          p.qual?.includes('auth.uid()') && 
          (p.qual?.includes('dm_id') || p.qual?.includes('= dm_id'))
        )
        
        expect(hasDmIdCheck).toBe(true)
      })
    })
  })
})
```

### Then Add Test Users Later

Once you have time, set up test users for integration tests.

---

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Security Tests
  run: npm run test:security
  
- name: Audit RLS Policies
  run: npm run test:rls-audit
```

This catches issues **before** they reach production.

---

## Summary

| Approach | Speed | Setup | Coverage | When to Use |
|----------|-------|-------|----------|-------------|
| **Policy Audit Tests** | ⚡ Fast | ✅ Easy | 90% | Every commit |
| **Integration Tests** | 🐌 Slow | ❌ Hard | 100% | Before releases |

**Start with policy audit tests** - they're fast, easy, and catch most issues.

**Add integration tests later** when you have time to set up test users.

Both together give you comprehensive security coverage! 🔒
