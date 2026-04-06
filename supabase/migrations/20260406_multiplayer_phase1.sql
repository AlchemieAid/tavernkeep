-- TavernKeep Multiplayer Phase 1: Players, Characters, Campaign Membership
-- Creates tables for player authentication, character management, and campaign invites

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS Policies for players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Players can read their own profile
CREATE POLICY "Players can read own profile"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

-- Players can insert their own profile
CREATE POLICY "Players can insert own profile"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Players can update their own profile
CREATE POLICY "Players can update own profile"
  ON players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for user_id lookups
CREATE INDEX players_user_id_idx ON players(user_id);

-- ============================================================================
-- CHARACTERS TABLE
-- ============================================================================
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, campaign_id, name)
);

-- RLS Policies for characters
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Players can read their own characters
CREATE POLICY "Players can read own characters"
  ON characters FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Players can insert their own characters
CREATE POLICY "Players can insert own characters"
  ON characters FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Players can update their own characters
CREATE POLICY "Players can update own characters"
  ON characters FOR UPDATE
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Players can delete their own characters
CREATE POLICY "Players can delete own characters"
  ON characters FOR DELETE
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- DMs can read characters in their campaigns
CREATE POLICY "DMs can read characters in their campaigns"
  ON characters FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX characters_player_campaign_idx ON characters(player_id, campaign_id);
CREATE INDEX characters_campaign_idx ON characters(campaign_id);

-- ============================================================================
-- CAMPAIGN_MEMBERS TABLE
-- ============================================================================
CREATE TABLE campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(campaign_id, player_id)
);

-- RLS Policies for campaign_members
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

-- Players can read their own memberships
CREATE POLICY "Players can read own memberships"
  ON campaign_members FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- DMs can read memberships in their campaigns
CREATE POLICY "DMs can read campaign memberships"
  ON campaign_members FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_id = auth.uid()
    )
  );

-- Players can insert their own memberships (via invite)
CREATE POLICY "Players can join campaigns"
  ON campaign_members FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- DMs can update memberships in their campaigns (revoke access)
CREATE POLICY "DMs can update campaign memberships"
  ON campaign_members FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_id = auth.uid()
    )
  );

-- DMs can delete memberships in their campaigns
CREATE POLICY "DMs can delete campaign memberships"
  ON campaign_members FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX campaign_members_campaign_idx ON campaign_members(campaign_id);
CREATE INDEX campaign_members_player_idx ON campaign_members(player_id);
CREATE INDEX campaign_members_active_idx ON campaign_members(campaign_id, is_active);

-- ============================================================================
-- ADD INVITE TOKEN TO CAMPAIGNS
-- ============================================================================
ALTER TABLE campaigns ADD COLUMN invite_token TEXT;
ALTER TABLE campaigns ADD COLUMN slug TEXT;

-- Generate unique invite tokens for existing campaigns
UPDATE campaigns SET invite_token = gen_random_uuid()::text WHERE invite_token IS NULL;

-- Make invite_token required and unique
ALTER TABLE campaigns ALTER COLUMN invite_token SET NOT NULL;
CREATE UNIQUE INDEX campaigns_invite_token_idx ON campaigns(invite_token);

-- Index for slug lookups
CREATE INDEX campaigns_slug_idx ON campaigns(slug) WHERE slug IS NOT NULL;

-- ============================================================================
-- UPDATED TIMESTAMP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
