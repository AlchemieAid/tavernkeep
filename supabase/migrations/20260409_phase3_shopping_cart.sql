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
