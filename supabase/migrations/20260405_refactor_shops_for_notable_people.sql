-- Refactor shops table to use Notable People instead of embedded keeper fields
-- This migration removes keeper-specific fields and adds a reference to notable_people

-- Add new column for notable person reference
ALTER TABLE shops
  ADD COLUMN notable_person_id UUID REFERENCES notable_people(id) ON DELETE SET NULL;

-- Add optional shop parameters
CREATE TYPE shop_reputation AS ENUM ('unknown', 'poor', 'fair', 'good', 'excellent');
CREATE TYPE shop_size AS ENUM ('tiny', 'small', 'medium', 'large', 'massive');
CREATE TYPE shop_security AS ENUM ('none', 'basic', 'moderate', 'high', 'fortress');

ALTER TABLE shops
  ADD COLUMN reputation shop_reputation DEFAULT 'fair',
  ADD COLUMN size shop_size DEFAULT 'medium',
  ADD COLUMN security shop_security DEFAULT 'basic',
  ADD COLUMN operating_hours TEXT DEFAULT 'Dawn to dusk',
  ADD COLUMN special_services TEXT[];

-- Create index for notable_person_id
CREATE INDEX idx_shops_notable_person_id ON shops(notable_person_id);

-- Add comments for documentation
COMMENT ON COLUMN shops.notable_person_id IS 'Reference to the notable person who runs this shop (if any)';
COMMENT ON COLUMN shops.reputation IS 'Shop reputation in the community';
COMMENT ON COLUMN shops.size IS 'Physical size of the shop';
COMMENT ON COLUMN shops.security IS 'Security level of the shop';
COMMENT ON COLUMN shops.operating_hours IS 'When the shop is open for business';
COMMENT ON COLUMN shops.special_services IS 'Array of special services offered (e.g., repairs, custom orders)';

-- Note: We're keeping the old keeper fields for backward compatibility
-- They can be deprecated in a future migration once all data is migrated
-- For now, shops can either have a notable_person_id OR use the legacy keeper fields
COMMENT ON COLUMN shops.keeper_name IS 'DEPRECATED: Use notable_person_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN shops.keeper_race IS 'DEPRECATED: Use notable_person_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN shops.keeper_backstory IS 'DEPRECATED: Use notable_person_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN shops.keeper_motivation IS 'DEPRECATED: Use notable_person_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN shops.keeper_personality_traits IS 'DEPRECATED: Use notable_person_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN shops.keeper_image_url IS 'DEPRECATED: Use notable_person_id instead. Kept for backward compatibility.';
