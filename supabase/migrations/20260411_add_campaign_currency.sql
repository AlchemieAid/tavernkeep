-- Add currency column to campaigns table to support custom campaign currencies
-- Default to 'gp' (gold pieces) for existing campaigns

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'gp';

-- Add comment for documentation
COMMENT ON COLUMN campaigns.currency IS 'Currency abbreviation used in this campaign (e.g., gp, sp, cp, sh)';
