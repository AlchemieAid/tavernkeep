-- Create Notable People entity
-- Notable People are town residents with various roles (shopkeepers, quest givers, rulers, etc.)

-- Create enum for notable person roles
CREATE TYPE notable_person_role AS ENUM (
  'shopkeeper', 'quest_giver', 'ruler', 'priest', 'magician',
  'merchant', 'guard', 'noble', 'commoner', 'blacksmith',
  'innkeeper', 'healer', 'scholar', 'criminal', 'artisan'
);

-- Create notable_people table
CREATE TABLE IF NOT EXISTS notable_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  town_id UUID NOT NULL REFERENCES towns(id) ON DELETE CASCADE,
  dm_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  race TEXT,
  role notable_person_role NOT NULL,
  backstory TEXT,
  motivation TEXT,
  personality_traits TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE notable_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DMs can view their own notable people"
  ON notable_people FOR SELECT
  USING (auth.uid() = dm_id);

CREATE POLICY "DMs can insert their own notable people"
  ON notable_people FOR INSERT
  WITH CHECK (auth.uid() = dm_id);

CREATE POLICY "DMs can update their own notable people"
  ON notable_people FOR UPDATE
  USING (auth.uid() = dm_id)
  WITH CHECK (auth.uid() = dm_id);

CREATE POLICY "DMs can delete their own notable people"
  ON notable_people FOR DELETE
  USING (auth.uid() = dm_id);

-- Create indexes for performance
CREATE INDEX idx_notable_people_town_id ON notable_people(town_id);
CREATE INDEX idx_notable_people_dm_id ON notable_people(dm_id);
CREATE INDEX idx_notable_people_role ON notable_people(role);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notable_people_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notable_people_updated_at
  BEFORE UPDATE ON notable_people
  FOR EACH ROW
  EXECUTE FUNCTION update_notable_people_updated_at();

-- Add comments for documentation
COMMENT ON TABLE notable_people IS 'Notable people in towns - can be shopkeepers, quest givers, rulers, etc.';
COMMENT ON COLUMN notable_people.role IS 'The role/occupation of this notable person';
COMMENT ON COLUMN notable_people.personality_traits IS 'Array of personality traits for roleplay';
