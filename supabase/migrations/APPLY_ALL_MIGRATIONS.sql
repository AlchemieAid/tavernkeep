-- ============================================================================
-- TAVERNKEEP: APPLY ALL MIGRATIONS AT ONCE
-- ============================================================================
-- Copy and paste this entire file into Supabase SQL Editor and click Run
-- This will apply all migrations in the correct order
-- ============================================================================

-- If you get "already exists" errors, that's OK - it means those parts are already set up
-- Just note which migrations succeeded and which failed

-- TavernKeep Initial Schema Migration
-- Creates all tables with RLS policies using anon key only

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- DMs can read their own campaigns
CREATE POLICY "DMs can read own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = dm_id);

-- DMs can insert their own campaigns
CREATE POLICY "DMs can insert own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = dm_id);

-- DMs can update their own campaigns
CREATE POLICY "DMs can update own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = dm_id)
  WITH CHECK (auth.uid() = dm_id);

-- DMs can delete their own campaigns
CREATE POLICY "DMs can delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = dm_id);

-- ============================================================================
-- SHOPS TABLE
-- ============================================================================
CREATE TYPE shop_type AS ENUM ('general', 'weapons', 'armor', 'magic', 'apothecary', 'black_market');
CREATE TYPE economic_tier AS ENUM ('poor', 'modest', 'comfortable', 'wealthy', 'opulent');
CREATE TYPE inventory_volatility AS ENUM ('static', 'slow', 'moderate', 'fast');

CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  dm_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  shop_type shop_type NOT NULL,
  location_descriptor TEXT,
  economic_tier economic_tier NOT NULL,
  price_modifier REAL NOT NULL DEFAULT 1.0 CHECK (price_modifier >= 0.5 AND price_modifier <= 2.0),
  haggle_enabled BOOLEAN NOT NULL DEFAULT false,
  haggle_dc INTEGER CHECK (haggle_dc >= 5 AND haggle_dc <= 30),
  inventory_volatility inventory_volatility NOT NULL DEFAULT 'static',
  last_restocked_at TIMESTAMPTZ,
  keeper_name TEXT,
  keeper_race TEXT,
  keeper_backstory TEXT,
  keeper_motivation TEXT,
  keeper_personality_traits TEXT[],
  keeper_image_url TEXT,
  shop_exterior_image_url TEXT,
  shop_interior_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug lookups (player-facing)
CREATE INDEX shops_slug_idx ON shops(slug);

-- Index for campaign lookups
CREATE INDEX shops_campaign_id_idx ON shops(campaign_id);

-- RLS Policies for shops
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- DMs can read their own shops
CREATE POLICY "DMs can read own shops"
  ON shops FOR SELECT
  USING (auth.uid() = dm_id);

-- Players can read active shops by slug (public access)
CREATE POLICY "Anyone can read active shops by slug"
  ON shops FOR SELECT
  USING (is_active = true);

-- DMs can insert their own shops
CREATE POLICY "DMs can insert own shops"
  ON shops FOR INSERT
  WITH CHECK (auth.uid() = dm_id);

-- DMs can update their own shops
CREATE POLICY "DMs can update own shops"
  ON shops FOR UPDATE
  USING (auth.uid() = dm_id)
  WITH CHECK (auth.uid() = dm_id);

-- DMs can delete their own shops
CREATE POLICY "DMs can delete own shops"
  ON shops FOR DELETE
  USING (auth.uid() = dm_id);

-- Function to ensure only one active shop per campaign
CREATE OR REPLACE FUNCTION ensure_single_active_shop()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE shops
    SET is_active = false
    WHERE campaign_id = NEW.campaign_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_shop_trigger
  BEFORE INSERT OR UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_shop();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ITEMS TABLE
-- ============================================================================
CREATE TYPE item_category AS ENUM ('weapon', 'armor', 'potion', 'scroll', 'tool', 'magic_item', 'misc');
CREATE TYPE item_rarity AS ENUM ('common', 'uncommon', 'rare', 'very_rare', 'legendary');

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category item_category NOT NULL,
  rarity item_rarity NOT NULL,
  base_price_gp INTEGER NOT NULL CHECK (base_price_gp >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  hidden_condition TEXT,
  image_url TEXT,
  weight_lbs REAL,
  properties JSONB,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Index for shop lookups
CREATE INDEX items_shop_id_idx ON items(shop_id);

-- Index for non-deleted items
CREATE INDEX items_active_idx ON items(shop_id) WHERE deleted_at IS NULL;

-- RLS Policies for items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- DMs can read all items in their shops (including hidden)
CREATE POLICY "DMs can read all items in own shops"
  ON items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = items.shop_id
        AND shops.dm_id = auth.uid()
    )
  );

-- Players can read non-hidden, non-deleted items in active shops (public access)
CREATE POLICY "Anyone can read visible items in active shops"
  ON items FOR SELECT
  USING (
    is_hidden = false
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = items.shop_id
        AND shops.is_active = true
    )
  );

-- DMs can insert items into their own shops
CREATE POLICY "DMs can insert items into own shops"
  ON items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = items.shop_id
        AND shops.dm_id = auth.uid()
    )
  );

-- DMs can update items in their own shops
CREATE POLICY "DMs can update items in own shops"
  ON items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = items.shop_id
        AND shops.dm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = items.shop_id
        AND shops.dm_id = auth.uid()
    )
  );

-- DMs can delete items in their own shops (soft delete via deleted_at)
CREATE POLICY "DMs can delete items in own shops"
  ON items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = items.shop_id
        AND shops.dm_id = auth.uid()
    )
  );

-- ============================================================================
-- PARTY_ACCESS TABLE
-- ============================================================================
CREATE TABLE party_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  player_alias TEXT,
  session_token TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session token lookups
CREATE INDEX party_access_session_token_idx ON party_access(session_token);

-- Index for campaign lookups
CREATE INDEX party_access_campaign_id_idx ON party_access(campaign_id);

-- RLS Policies for party_access
ALTER TABLE party_access ENABLE ROW LEVEL SECURITY;

-- DMs can read party access for their campaigns
CREATE POLICY "DMs can read party access for own campaigns"
  ON party_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = party_access.campaign_id
        AND campaigns.dm_id = auth.uid()
    )
  );

-- Anyone can insert party access (for tracking player visits)
CREATE POLICY "Anyone can insert party access"
  ON party_access FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own session
CREATE POLICY "Anyone can update own session"
  ON party_access FOR UPDATE
  USING (true)
  WITH CHECK (true);
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Activate all existing shops that are currently inactive
UPDATE shops SET is_active = true WHERE is_active = false;
-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL, -- 'campaign', 'town', 'shop', 'item'
  prompt TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(10, 6) NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = dm_id);

CREATE POLICY "Users can insert their own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = dm_id);

-- Create index for faster queries
CREATE INDEX idx_ai_usage_dm_id ON ai_usage(dm_id);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER set_ai_usage_updated_at
  BEFORE UPDATE ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
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
-- Fix invite token lookup by allowing public access to campaigns via invite_token
-- This allows the /join/[token] page to look up campaigns before authentication

-- Allow anyone to read campaign basic info when looking up by invite_token
-- This is safe because invite tokens are UUIDs (unguessable) and we only expose minimal info
CREATE POLICY "Anyone can lookup campaigns by invite token"
  ON campaigns FOR SELECT
  USING (invite_token IS NOT NULL);

-- Note: This policy works alongside the existing "DMs can read own campaigns" policy
-- RLS policies are OR'd together, so both conditions allow access
-- TavernKeep Phase 3: Shopping Cart System
-- Creates cart_items table with item locking and conflict detection

-- ============================================================================
-- CART ITEMS TABLE
-- ============================================================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate items in same character's cart
  UNIQUE(character_id, item_id)
);

-- ============================================================================
-- INDEXES FOR CART QUERIES
-- ============================================================================

-- Index for fetching a character's cart
CREATE INDEX cart_items_character_idx ON cart_items(character_id);

-- Index for checking if an item is locked by anyone
CREATE INDEX cart_items_item_idx ON cart_items(item_id);

-- Index for fetching all carts in a shop (DM view)
CREATE INDEX cart_items_shop_idx ON cart_items(shop_id);

-- Composite index for character + shop queries
CREATE INDEX cart_items_character_shop_idx ON cart_items(character_id, shop_id);

-- ============================================================================
-- RLS POLICIES FOR CART ACCESS
-- ============================================================================

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Players can read their own character's cart items
CREATE POLICY "Players can view own character cart"
  ON cart_items FOR SELECT
  USING (
    character_id IN (
      SELECT c.id
      FROM characters c
      JOIN players p ON p.id = c.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Players can add items to their own character's cart
CREATE POLICY "Players can add to own character cart"
  ON cart_items FOR INSERT
  WITH CHECK (
    character_id IN (
      SELECT c.id
      FROM characters c
      JOIN players p ON p.id = c.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Players can update their own character's cart items (quantity changes)
CREATE POLICY "Players can update own character cart"
  ON cart_items FOR UPDATE
  USING (
    character_id IN (
      SELECT c.id
      FROM characters c
      JOIN players p ON p.id = c.player_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    character_id IN (
      SELECT c.id
      FROM characters c
      JOIN players p ON p.id = c.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Players can remove items from their own character's cart
CREATE POLICY "Players can delete from own character cart"
  ON cart_items FOR DELETE
  USING (
    character_id IN (
      SELECT c.id
      FROM characters c
      JOIN players p ON p.id = c.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- DMs can view all cart items in their campaigns
CREATE POLICY "DMs can view all carts in their campaigns"
  ON cart_items FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE dm_id = auth.uid()
    )
  );

-- DMs can delete cart items in their campaigns (for cleanup/admin)
CREATE POLICY "DMs can delete carts in their campaigns"
  ON cart_items FOR DELETE
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE dm_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Check if item is locked by another character
-- ============================================================================

CREATE OR REPLACE FUNCTION is_item_locked_by_other(
  p_item_id UUID,
  p_character_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM cart_items
    WHERE item_id = p_item_id
      AND character_id != p_character_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get all characters with item in cart (conflict detection)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cart_conflicts(p_item_id UUID)
RETURNS TABLE (
  character_id UUID,
  character_name TEXT,
  player_display_name TEXT,
  quantity INTEGER,
  locked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.character_id,
    c.name as character_name,
    p.display_name as player_display_name,
    ci.quantity,
    ci.locked_at
  FROM cart_items ci
  JOIN characters c ON c.id = ci.character_id
  JOIN players p ON p.id = c.player_id
  WHERE ci.item_id = p_item_id
  ORDER BY ci.locked_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE cart_items IS 'Player shopping carts with item locking to prevent conflicts';
COMMENT ON COLUMN cart_items.locked_at IS 'Timestamp when item was added to cart (for conflict resolution)';
COMMENT ON FUNCTION is_item_locked_by_other IS 'Check if an item is already in another characters cart';
COMMENT ON FUNCTION get_cart_conflicts IS 'Get all characters who have this item in their cart (for DM conflict resolution)';
-- Fix items RLS policy to use is_revealed instead of is_hidden
-- Phase 2 missed adding is_revealed to items table

-- Add is_revealed column to items table (default false - hidden until DM reveals)
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering revealed items
CREATE INDEX IF NOT EXISTS items_shop_revealed_idx ON items(shop_id, is_revealed);

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
-- Add currency column to campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'gp';

-- Add comment for documentation
COMMENT ON COLUMN campaigns.currency IS 'Currency abbreviation used in this campaign (e.g., gp, sp, cp, sh)';
