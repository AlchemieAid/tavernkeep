-- Add campaign-level parameters for AI generation context
-- These fields inform the AI about the world/setting for better generation

ALTER TABLE campaigns
  ADD COLUMN ruleset TEXT DEFAULT '5e',
  ADD COLUMN setting TEXT,
  ADD COLUMN history TEXT,
  ADD COLUMN currency TEXT DEFAULT 'Gold Pieces (gp)',
  ADD COLUMN pantheon TEXT;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.ruleset IS 'RPG ruleset (5e, 4e, 3e, 2e, Pathfinder, Traveler, etc.)';
COMMENT ON COLUMN campaigns.setting IS 'World/setting name and description';
COMMENT ON COLUMN campaigns.history IS 'Campaign history and lore';
COMMENT ON COLUMN campaigns.currency IS 'Currency system used in this campaign';
COMMENT ON COLUMN campaigns.pantheon IS 'Deities and religious system';
