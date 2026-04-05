-- Add town-level parameters for AI generation context
-- These fields provide detailed town characteristics for better generation

-- Create enum types for town parameters
CREATE TYPE town_size AS ENUM ('hamlet', 'village', 'town', 'city', 'metropolis');
CREATE TYPE geographic_location AS ENUM (
  'desert', 'forest', 'wilderness', 'necropolis', 'arctic', 
  'plains', 'riverside', 'coastal', 'mountain', 'swamp', 
  'underground', 'floating', 'jungle'
);
CREATE TYPE political_system AS ENUM (
  'monarchy', 'democracy', 'oligarchy', 'theocracy', 'anarchy',
  'military', 'tribal', 'merchant_guild', 'magocracy'
);

ALTER TABLE towns
  ADD COLUMN population INTEGER,
  ADD COLUMN size town_size,
  ADD COLUMN location geographic_location,
  ADD COLUMN ruler TEXT,
  ADD COLUMN political_system political_system,
  ADD COLUMN history TEXT;

-- Add comments for documentation
COMMENT ON COLUMN towns.population IS 'Approximate population count';
COMMENT ON COLUMN towns.size IS 'Geographic/political size classification';
COMMENT ON COLUMN towns.location IS 'Geographic location type';
COMMENT ON COLUMN towns.ruler IS 'Current ruler or leadership';
COMMENT ON COLUMN towns.political_system IS 'Form of government';
COMMENT ON COLUMN towns.history IS 'Town history and notable events';
