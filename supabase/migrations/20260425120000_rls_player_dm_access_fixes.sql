-- ============================================================
-- RLS Policy Fixes: Player/DM Access & Security Hardening
-- Migration: 20260425120000_rls_player_dm_access_fixes.sql
--
-- Changes:
--   1. Players can read basic campaign info for campaigns they've joined
--   2. DMs can read player records for members of their campaigns
--   3. Drop permissive admin_audit_log INSERT (audit.ts now uses service-role)
--   4. Drop fully permissive party_access UPDATE (no active app code uses it;
--      table is legacy pre-auth session tracking)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Players can read campaigns they've joined
--    Without this, a player who joins a campaign cannot see the
--    campaign name, currency, or description — essential for any
--    player-facing dashboard or shop view.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Players can read joined campaigns" ON campaigns;

CREATE POLICY "Players can read joined campaigns"
  ON campaigns FOR SELECT
  USING (
    id IN (
      SELECT cm.campaign_id
      FROM campaign_members cm
      JOIN players p ON p.id = cm.player_id
      WHERE p.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- ------------------------------------------------------------
-- 2. DMs can read player records for their campaign members
--    Without this, DMs managing their party cannot resolve
--    player display names (characters join to players, not profiles).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "DMs can read players in their campaigns" ON players;

CREATE POLICY "DMs can read players in their campaigns"
  ON players FOR SELECT
  USING (
    id IN (
      SELECT cm.player_id
      FROM campaign_members cm
      JOIN campaigns c ON c.id = cm.campaign_id
      WHERE c.dm_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. Remove the permissive INSERT on admin_audit_log.
--    audit.ts now calls createAdminClient() (service-role) for
--    all writes. Service-role bypasses RLS automatically, so
--    no INSERT policy is required — and having WITH CHECK (true)
--    would allow any authenticated user to inject fake entries.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "system_insert_audit_log" ON admin_audit_log;

-- ------------------------------------------------------------
-- 4. Remove the fully permissive UPDATE on party_access.
--    USING (true) + WITH CHECK (true) allowed any request to
--    UPDATE any row in the table.  The party_access table is
--    legacy (pre-auth anonymous session tracking, superseded by
--    campaign_members + players); no active app code issues
--    these UPDATEs via the anon client.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can update own session" ON party_access;

COMMENT ON TABLE party_access IS
'Legacy anonymous session tracking (pre-auth era). Superseded by campaign_members + players.
INSERT remains open for backward compatibility; UPDATE removed (no active app usage).
Service-role is required for any administrative updates.';
