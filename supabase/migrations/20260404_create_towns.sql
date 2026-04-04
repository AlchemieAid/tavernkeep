-- Create towns table
CREATE TABLE IF NOT EXISTS towns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  dm_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add town_id to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS town_id UUID REFERENCES towns(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_towns_campaign_id ON towns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_towns_dm_id ON towns(dm_id);
CREATE INDEX IF NOT EXISTS idx_shops_town_id ON shops(town_id);

-- Enable RLS on towns table
ALTER TABLE towns ENABLE ROW LEVEL SECURITY;

-- RLS policies for towns
CREATE POLICY "DMs can view their own towns"
  ON towns FOR SELECT
  USING (auth.uid() = dm_id);

CREATE POLICY "DMs can create towns for their campaigns"
  ON towns FOR INSERT
  WITH CHECK (auth.uid() = dm_id);

CREATE POLICY "DMs can update their own towns"
  ON towns FOR UPDATE
  USING (auth.uid() = dm_id);

CREATE POLICY "DMs can delete their own towns"
  ON towns FOR DELETE
  USING (auth.uid() = dm_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_towns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER towns_updated_at
  BEFORE UPDATE ON towns
  FOR EACH ROW
  EXECUTE FUNCTION update_towns_updated_at();
