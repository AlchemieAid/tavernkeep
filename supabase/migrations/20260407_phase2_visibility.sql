-- TavernKeep Phase 2: Visibility System
-- Adds is_revealed column to towns, shops, and notable_people for DM control

-- ============================================================================
-- ADD VISIBILITY COLUMNS
-- ============================================================================

-- Towns: Add is_revealed column (default false - hidden until DM reveals)
ALTER TABLE towns ADD COLUMN is_revealed BOOLEAN NOT NULL DEFAULT false;

-- Shops: Add is_revealed column (default false - hidden until DM reveals)
ALTER TABLE shops ADD COLUMN is_revealed BOOLEAN NOT NULL DEFAULT false;

-- Notable People: Add is_revealed column (default false - hidden until DM reveals)
ALTER TABLE notable_people ADD COLUMN is_revealed BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- CREATE INDEXES FOR VISIBILITY QUERIES
-- ============================================================================

-- Index for filtering revealed towns in a campaign
CREATE INDEX towns_campaign_revealed_idx ON towns(campaign_id, is_revealed);

-- Index for filtering revealed shops in a campaign
CREATE INDEX shops_campaign_revealed_idx ON shops(campaign_id, is_revealed);

-- Index for filtering revealed shops in a town
CREATE INDEX shops_town_revealed_idx ON shops(town_id, is_revealed) WHERE town_id IS NOT NULL;

-- Index for filtering revealed notable people in a town
CREATE INDEX notable_people_town_revealed_idx ON notable_people(town_id, is_revealed);

-- ============================================================================
-- UPDATE RLS POLICIES FOR PLAYER ACCESS
-- ============================================================================

-- Players can only see revealed towns in campaigns they're members of
CREATE POLICY "Players can view revealed towns in their campaigns"
  ON towns FOR SELECT
  USING (
    is_revealed = true
    AND campaign_id IN (
      SELECT cm.campaign_id
      FROM campaign_members cm
      JOIN players p ON p.id = cm.player_id
      WHERE p.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- Players can only see revealed shops in campaigns they're members of
CREATE POLICY "Players can view revealed shops in their campaigns"
  ON shops FOR SELECT
  USING (
    is_revealed = true
    AND campaign_id IN (
      SELECT cm.campaign_id
      FROM campaign_members cm
      JOIN players p ON p.id = cm.player_id
      WHERE p.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- Players can only see revealed notable people in towns they have access to
CREATE POLICY "Players can view revealed notable people in their campaigns"
  ON notable_people FOR SELECT
  USING (
    is_revealed = true
    AND town_id IN (
      SELECT t.id
      FROM towns t
      JOIN campaign_members cm ON cm.campaign_id = t.campaign_id
      JOIN players p ON p.id = cm.player_id
      WHERE p.user_id = auth.uid()
        AND cm.is_active = true
        AND t.is_revealed = true
    )
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN towns.is_revealed IS 'Whether this town is visible to players. DMs control visibility.';
COMMENT ON COLUMN shops.is_revealed IS 'Whether this shop is visible to players. DMs control visibility. Parent town must also be revealed.';
COMMENT ON COLUMN notable_people.is_revealed IS 'Whether this notable person is visible to players. DMs control visibility. Parent town must also be revealed.';
