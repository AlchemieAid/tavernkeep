# Security Tests

This directory contains security tests to ensure data isolation and prevent unauthorized access.

## Test Suites

### `data-isolation.test.ts`

Tests to ensure DMs can only access their own data and cannot see or modify other DMs' content.

**What it tests:**
- Campaign isolation
- Town isolation  
- Shop isolation
- Item isolation
- Item library isolation
- Notable people isolation
- Cross-DM data leakage prevention

**Critical Security Requirements:**
1. DMs can ONLY read their own campaigns, towns, shops, items, and notable people
2. DMs cannot read, update, or delete another DM's data
3. Joins and nested queries don't leak data across DM boundaries
4. RLS policies are properly enforced at the database level

## Running Security Tests

```bash
# Run all security tests
npm run test:security

# Run specific test file
npm test __tests__/security/data-isolation.test.ts

# Run with coverage
npm test -- --coverage __tests__/security/
```

## Security Issues Fixed

### Issue: Shop Data Leakage (Fixed 2026-04-17)

**Problem:** The RLS policy "Anyone can read active shops by slug" allowed ANY authenticated user to read ALL active shops, not just their own. This meant DMs could see other DMs' shops.

**Root Cause:** Overly permissive RLS policy on the `shops` table:
```sql
-- BAD (removed)
CREATE POLICY "Anyone can read active shops by slug"
ON shops FOR SELECT
USING (is_active = true);
```

**Fix:** 
1. Dropped the overly permissive policy
2. Added `is_public` boolean column to shops table
3. Created more restrictive policy that only allows public access to shops explicitly marked as public:
```sql
-- GOOD (current)
CREATE POLICY "Public shops can be viewed by slug"
ON shops FOR SELECT TO public
USING (is_public = true AND is_active = true);
```

**Migration:** `20260417000000_fix_shop_rls_policy.sql`

## RLS Policy Verification

To verify RLS policies are correctly configured:

```sql
-- Check if RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('campaigns', 'towns', 'shops', 'items', 'notable_people', 'item_library')
ORDER BY tablename;

-- Check policies on a specific table
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'shops'
ORDER BY cmd, policyname;
```

## Test Data Setup

For proper testing, you need:
1. Two separate test DM users
2. Each DM with their own campaign
3. Each campaign with towns, shops, items, etc.
4. Authenticated Supabase clients for each DM

## Expected Behavior

### ✅ Allowed Operations
- DM can read their own campaigns
- DM can read their own towns
- DM can read their own shops
- DM can read items from their own shops
- DM can read their own item library
- DM can read their own notable people

### ❌ Blocked Operations
- DM cannot read another DM's campaigns
- DM cannot read another DM's towns
- DM cannot read another DM's shops (even if active)
- DM cannot read items from another DM's shops
- DM cannot read another DM's item library
- DM cannot read another DM's notable people
- DM cannot update or delete another DM's data

## Continuous Monitoring

These tests should be run:
- Before every deployment
- After any RLS policy changes
- After any database schema changes
- As part of CI/CD pipeline

## Reporting Security Issues

If you discover a security vulnerability:
1. DO NOT create a public GitHub issue
2. Contact the development team directly
3. Provide detailed reproduction steps
4. Include test cases if possible
