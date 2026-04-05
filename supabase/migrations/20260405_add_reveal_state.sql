-- Add reveal_state column to items table
-- reveal_state controls whether a hidden item is currently visible to players
-- is_hidden (form-controlled) determines if the item is a "hidden item"
-- reveal_state (eye toggle) determines current player visibility

ALTER TABLE items
ADD COLUMN reveal_state BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN items.reveal_state IS 'Controls whether a hidden item is currently revealed to players. Only relevant when is_hidden = true.';

-- Add index for player queries (filtering by reveal_state)
CREATE INDEX items_reveal_state_idx ON items(reveal_state) WHERE is_hidden = true;
