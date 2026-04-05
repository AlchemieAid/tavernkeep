-- Add enhanced item parameters for better item management and tracking

-- Create enum for item source tracking
CREATE TYPE item_source AS ENUM ('purchased', 'crafted', 'looted', 'generated', 'quest_reward', 'gift');

ALTER TABLE items
  ADD COLUMN attunement_required BOOLEAN DEFAULT false,
  ADD COLUMN cursed BOOLEAN DEFAULT false,
  ADD COLUMN identified BOOLEAN DEFAULT true,
  ADD COLUMN crafting_time_days INTEGER,
  ADD COLUMN source item_source DEFAULT 'generated';

-- Add comments for documentation
COMMENT ON COLUMN items.attunement_required IS 'Whether this item requires attunement to use';
COMMENT ON COLUMN items.cursed IS 'Whether this item is cursed';
COMMENT ON COLUMN items.identified IS 'Whether this item has been identified (for mystery items)';
COMMENT ON COLUMN items.crafting_time_days IS 'Days required to craft this item (for custom orders)';
COMMENT ON COLUMN items.source IS 'How this item was acquired/created';
