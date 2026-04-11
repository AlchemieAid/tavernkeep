-- Change default for is_revealed to true for shops and items
-- Shops and items should be visible by default, only special hidden items should be revealed=false

-- Update existing shops to be revealed
UPDATE shops SET is_revealed = true WHERE is_revealed = false;

-- Update existing items to be revealed (except those marked as hidden via is_hidden flag)
UPDATE items SET is_revealed = true WHERE is_revealed = false AND (is_hidden = false OR is_hidden IS NULL);

-- Change default for shops
ALTER TABLE shops ALTER COLUMN is_revealed SET DEFAULT true;

-- Change default for items  
ALTER TABLE items ALTER COLUMN is_revealed SET DEFAULT true;

COMMENT ON COLUMN shops.is_revealed IS 'Whether shop is visible to players (default true)';
COMMENT ON COLUMN items.is_revealed IS 'Whether item is visible to players (default true, false for hidden items)';
