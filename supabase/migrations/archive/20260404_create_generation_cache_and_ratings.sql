-- Create generation cache table for reusing AI outputs
CREATE TABLE IF NOT EXISTS generation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_type TEXT NOT NULL,
  prompt_normalized TEXT NOT NULL, -- Lowercase, trimmed prompt for matching
  prompt_original TEXT NOT NULL,
  output_data JSONB NOT NULL, -- The generated campaign/town/shop/item data
  tokens_used INTEGER NOT NULL,
  model TEXT NOT NULL,
  times_reused INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2), -- Average rating from 1-5
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS generation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_id UUID REFERENCES generation_cache(id) ON DELETE CASCADE,
  dm_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cache_id, dm_id) -- One rating per user per cached generation
);

-- Enable RLS
ALTER TABLE generation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_ratings ENABLE ROW LEVEL SECURITY;

-- Cache policies (public read for reuse, authenticated insert)
CREATE POLICY "Anyone can view cache"
  ON generation_cache FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert cache"
  ON generation_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "System can update cache stats"
  ON generation_cache FOR UPDATE
  USING (true);

-- Rating policies
CREATE POLICY "Users can view all ratings"
  ON generation_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON generation_ratings FOR INSERT
  WITH CHECK (auth.uid() = dm_id);

CREATE POLICY "Users can update their own ratings"
  ON generation_ratings FOR UPDATE
  USING (auth.uid() = dm_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_type_prompt ON generation_cache(generation_type, prompt_normalized);
CREATE INDEX IF NOT EXISTS idx_cache_rating ON generation_cache(average_rating DESC) WHERE average_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_reuse ON generation_cache(times_reused DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_cache ON generation_ratings(cache_id);

-- Function to update cache average rating
CREATE OR REPLACE FUNCTION update_cache_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE generation_cache
  SET 
    average_rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM generation_ratings
      WHERE cache_id = NEW.cache_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM generation_ratings
      WHERE cache_id = NEW.cache_id
    )
  WHERE id = NEW.cache_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ratings when a new rating is added or updated
CREATE TRIGGER update_cache_rating_trigger
  AFTER INSERT OR UPDATE ON generation_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_cache_rating();
