-- Update price_modifier to use integer percentage (50-200 instead of 0.5-2.0)
-- This aligns the database with the UI which now uses percentages like 100%, 110%, etc.

-- First, drop the old constraint
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_price_modifier_check;

-- Update existing values: multiply by 100 to convert from decimal to percentage
-- e.g., 1.0 -> 100, 1.1 -> 110, 0.7 -> 70
UPDATE shops SET price_modifier = ROUND(price_modifier * 100);

-- Add new constraint for integer percentages (50% to 200%)
ALTER TABLE shops ADD CONSTRAINT shops_price_modifier_check 
  CHECK (price_modifier >= 50 AND price_modifier <= 200);

-- Update default value to 100 (100%)
ALTER TABLE shops ALTER COLUMN price_modifier SET DEFAULT 100;
