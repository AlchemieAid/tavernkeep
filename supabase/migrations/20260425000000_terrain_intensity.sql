-- Add intensity field to terrain_areas for Gaussian soft-blend terrain system.
-- Intensity [0..1] controls how strongly a terrain blob dominates at its centre.
-- Existing rows default to 1.0 (full intensity) for backward compatibility.
ALTER TABLE terrain_areas
  ADD COLUMN IF NOT EXISTS intensity DOUBLE PRECISION NOT NULL DEFAULT 1.0;
