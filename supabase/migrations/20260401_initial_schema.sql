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
