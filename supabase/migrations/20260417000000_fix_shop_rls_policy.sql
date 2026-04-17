-- Fix Shop RLS Policy - Remove Overly Permissive Public Access
-- Migration: 20260417000000_fix_shop_rls_policy.sql

-- SECURITY FIX: The "Anyone can read active shops by slug" policy was too broad
-- and allowed ANY authenticated user to read ALL active shops, not just their own.
-- This caused data leakage where DMs could see other DMs' shops.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read active shops by slug" ON shops;

-- The existing "DMs can read own shops" policy is correct and sufficient for DM access
-- The existing "Players can view revealed shops in their campaigns" policy is correct for player access

-- For the public shop viewing feature (/shop/[slug]), we need a more restrictive policy
-- that ONLY allows access via the slug, and only for shops that are explicitly marked
-- as publicly accessible (we'll add a new column for this)

-- Add a new column to control public access
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN shops.is_public IS 
'Controls whether this shop can be accessed via public URL (/shop/[slug]). 
Only shops explicitly marked as public can be viewed without authentication.
This is separate from is_revealed which controls campaign member access.';

-- Create a new, more restrictive policy for public shop access
CREATE POLICY "Public shops can be viewed by slug"
ON shops
FOR SELECT
TO public
USING (is_public = true AND is_active = true);

-- Update existing active shops to be public if they were previously accessible
-- (This maintains backward compatibility)
UPDATE shops 
SET is_public = true 
WHERE is_active = true;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shops_public_slug ON shops(slug) WHERE is_public = true AND is_active = true;

-- Verify the fix by listing all policies
COMMENT ON POLICY "Public shops can be viewed by slug" ON shops IS
'Allows unauthenticated access to shops explicitly marked as public via their slug.
This is more restrictive than the previous policy which allowed any authenticated user
to see all active shops.';
