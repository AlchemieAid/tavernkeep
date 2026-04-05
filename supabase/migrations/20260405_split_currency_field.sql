-- Split currency field into currency_name and currency_description
-- This allows for a short currency name (e.g., "gp") and a longer description

-- Add new columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS currency_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS currency_description TEXT;

-- Migrate existing data: extract short name from currency field
-- If currency is like "Gold Pieces (gp)", extract "gp"
-- Otherwise use the whole value as currency_name
UPDATE campaigns
SET 
  currency_name = CASE
    WHEN currency ~ '\([^)]+\)$' THEN 
      regexp_replace(currency, '.*\(([^)]+)\).*', '\1')
    ELSE 
      COALESCE(currency, 'gp')
  END,
  currency_description = currency
WHERE currency IS NOT NULL;

-- Set defaults for rows with null currency
UPDATE campaigns
SET 
  currency_name = 'gp',
  currency_description = 'Gold Pieces (gp)'
WHERE currency IS NULL;

-- Drop old currency column
ALTER TABLE campaigns DROP COLUMN IF EXISTS currency;
