-- Fix Campaign RLS Policy - Remove Data Leakage
-- 
-- ISSUE: The "Anyone can lookup campaigns by invite token" policy allows
-- ANY authenticated user to read ALL campaigns (since all campaigns have invite_token).
-- This causes DMs to see other DMs' campaigns in their dashboard.
--
-- SIMILAR TO: 20260417000000_fix_shop_rls_policy.sql (same issue, different table)
--
-- SOLUTION: Drop the overly permissive policy. The invite lookup should be
-- handled differently (e.g., a specific API endpoint that doesn't rely on RLS).

-- Drop the problematic policy
DROP POLICY IF EXISTS "Anyone can lookup campaigns by invite token" ON campaigns;

-- The remaining policies are correct:
-- ✅ "DMs can read own campaigns" - USING (auth.uid() = dm_id)
-- ✅ "DMs can insert own campaigns" - WITH CHECK (auth.uid() = dm_id)
-- ✅ "DMs can update own campaigns" - USING (auth.uid() = dm_id)
-- ✅ "DMs can delete own campaigns" - USING (auth.uid() = dm_id)

-- NOTE: If invite token lookup is needed, it should be implemented via:
-- 1. A server-side API route that bypasses RLS
-- 2. Or a more specific policy that only allows SELECT on specific columns
-- 3. Or a separate public view for invite validation

-- Verify RLS is enabled
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the fix
COMMENT ON TABLE campaigns IS 'Campaign data with strict RLS - DMs can only access their own campaigns. Invite token lookup should be handled via server-side API routes, not RLS policies.';
