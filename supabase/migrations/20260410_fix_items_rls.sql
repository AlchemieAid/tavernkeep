-- Fix items RLS policy to use is_revealed instead of is_hidden
-- Phase 2 missed adding is_revealed to items table

-- Add is_revealed column to items table (default false - hidden until DM reveals)
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering revealed items
CREATE INDEX IF NOT EXISTS items_shop_revealed_idx ON items(shop_id, is_revealed);

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can read visible items in active shops" ON items;
DROP POLICY IF EXISTS "Players can view revealed items in their campaigns" ON items;

-- Create new policy using is_revealed for player access
CREATE POLICY "Players can view revealed items in their campaigns"
  ON items FOR SELECT
  USING (
    is_revealed = true
    AND deleted_at IS NULL
    AND shop_id IN (
      SELECT s.id
      FROM shops s
      JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
      JOIN players p ON p.id = cm.player_id
      WHERE p.user_id = auth.uid()
        AND cm.is_active = true
        AND s.is_revealed = true
        AND s.is_active = true
    )
  );

COMMENT ON POLICY "Players can view revealed items in their campaigns" ON items IS 'Players can only see revealed items in revealed shops within campaigns they are members of';
