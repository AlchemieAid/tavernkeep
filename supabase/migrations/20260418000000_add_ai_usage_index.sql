-- Add index to ai_usage table for faster rate limit checks
-- This index covers the exact query used in checkRateLimit:
-- WHERE dm_id = ? AND generation_type = ? AND created_at >= ?

-- Create composite index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_rate_limit 
ON ai_usage (dm_id, generation_type, created_at DESC);

-- Add comment explaining the index
COMMENT ON INDEX idx_ai_usage_rate_limit IS 
'Composite index for rate limit checks. Covers queries filtering by dm_id, generation_type, and created_at. DESC on created_at for efficient time-window queries.';
