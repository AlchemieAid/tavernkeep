-- ============================================================
-- Fix: RLS infinite recursion introduced by cross-table policies
--
-- Root cause:
--   "Players can read joined campaigns" on campaigns  → reads campaign_members
--   "DMs can read campaign memberships" on campaign_members → reads campaigns
--   → cycle detected by Postgres (code 42P17)
--
-- Fix: replace inline subqueries with SECURITY DEFINER functions
--   that read the underlying tables WITHOUT triggering their RLS policies.
-- ============================================================

-- Helper: is the current user an active member of this campaign?
-- SECURITY DEFINER bypasses RLS on campaign_members + players.
CREATE OR REPLACE FUNCTION player_is_active_member(campaign_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM campaign_members cm
    JOIN players p ON p.id = cm.player_id
    WHERE cm.campaign_id = campaign_uuid
      AND p.user_id    = auth.uid()
      AND cm.is_active = true
  );
$$;

-- Helper: is this player a member of any campaign the current user DMs?
-- SECURITY DEFINER bypasses RLS on campaign_members + campaigns.
CREATE OR REPLACE FUNCTION dm_has_player_in_campaign(player_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM campaign_members cm
    JOIN campaigns c ON c.id = cm.campaign_id
    WHERE cm.player_id = player_uuid
      AND c.dm_id      = auth.uid()
  );
$$;

-- Recreate campaigns player policy using the helper (breaks the cycle)
DROP POLICY IF EXISTS "Players can read joined campaigns" ON campaigns;

CREATE POLICY "Players can read joined campaigns"
  ON campaigns FOR SELECT
  USING (player_is_active_member(id));

-- Recreate players DM policy using the helper (breaks the cycle)
DROP POLICY IF EXISTS "DMs can read players in their campaigns" ON players;

CREATE POLICY "DMs can read players in their campaigns"
  ON players FOR SELECT
  USING (dm_has_player_in_campaign(id));
