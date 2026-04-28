-- Add per-map wealth floor/ceiling to campaign_maps.
-- These are used to linearly remap the raw IDW wealth score before it is
-- stored on world_towns, enabling DMs to model a "poor frontier" or "rich
-- empire" without altering the underlying economic model.
-- Defaults (0.0 / 1.0) produce identical behaviour to before this migration.

ALTER TABLE campaign_maps
  ADD COLUMN IF NOT EXISTS wealth_floor   REAL NOT NULL DEFAULT 0.0
    CHECK (wealth_floor  >= 0.0 AND wealth_floor  <= 1.0),
  ADD COLUMN IF NOT EXISTS wealth_ceiling REAL NOT NULL DEFAULT 1.0
    CHECK (wealth_ceiling >= 0.0 AND wealth_ceiling <= 1.0);
