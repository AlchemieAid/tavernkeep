-- Add ruler_id foreign key to towns table to link to notable_people
-- This allows towns to reference a notable person as their ruler instead of just storing a text name

-- Add the new column
ALTER TABLE towns ADD COLUMN IF NOT EXISTS ruler_id UUID REFERENCES notable_people(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_towns_ruler_id ON towns(ruler_id);

-- Add comment for documentation
COMMENT ON COLUMN towns.ruler_id IS 'Reference to the notable person who rules this town';

-- Note: The existing 'ruler' TEXT column will be kept for backward compatibility
-- and for cases where the ruler is not a notable person in the database
