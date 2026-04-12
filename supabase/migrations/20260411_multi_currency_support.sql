-- Multi-Currency System Migration
-- Supports both single currency (current) and future multi-currency arrays

-- Add currencies JSONB array for future multi-currency support
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS currencies JSONB DEFAULT NULL;

-- Add base_currency_reference to items for currency tracking
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS currency_reference TEXT DEFAULT 'gp';

-- Migration: Convert existing currency to currencies array format
UPDATE campaigns
SET currencies = jsonb_build_array(
  jsonb_build_object(
    'code', COALESCE(currency, 'gp'),
    'name', CASE 
      WHEN currency = 'gp' THEN 'Gold Pieces'
      WHEN currency = 'sp' THEN 'Silver Pieces'
      WHEN currency = 'cp' THEN 'Copper Pieces'
      WHEN currency = 'sh' THEN 'Shillings'
      WHEN currency = 'pp' THEN 'Platinum Pieces'
      ELSE INITCAP(COALESCE(currency, 'gp'))
    END,
    'symbol', COALESCE(currency, 'gp'),
    'base_value', 1,
    'is_primary', true,
    'is_default', true
  )
)
WHERE currencies IS NULL;

-- Create index for currency queries
CREATE INDEX IF NOT EXISTS idx_campaigns_currencies ON campaigns USING GIN(currencies);

-- Add comment for documentation
COMMENT ON COLUMN campaigns.currencies IS 'JSONB array of currency objects: [{code, name, symbol, base_value, is_primary, is_default, conversion_rate}]';
COMMENT ON COLUMN items.currency_reference IS 'Currency code used for this items price (references campaigns.currencies)';

