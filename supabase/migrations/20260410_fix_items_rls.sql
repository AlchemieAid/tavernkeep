-- Fix items RLS policy to use is_revealed instead of is_hidden
-- Phase 2 added is_revealed but didn't update the player access policy

-- Drop old policy
DROP POLICY IF EXISTS "Anyone can read visible items in active shops" ON items;

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
