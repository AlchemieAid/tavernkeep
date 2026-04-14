-- Add AI cache table for caching AI responses
CREATE TABLE IF NOT EXISTS public.ai_cache (
    cache_key TEXT PRIMARY KEY,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0
);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_ai_cache_created_at ON public.ai_cache(created_at);

-- Add usage logs table for monitoring
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service TEXT NOT NULL, -- 'openai', 'supabase', etc.
    operation TEXT NOT NULL, -- 'generate-campaign', 'query', etc.
    dm_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_service ON public.usage_logs(service);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON public.usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_dm_id ON public.usage_logs(dm_id);

-- Enable RLS on new tables
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_cache (server-side only, no user access)
CREATE POLICY "Service role can manage cache"
    ON public.ai_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS policies for usage_logs
CREATE POLICY "Users can view their own usage logs"
    ON public.usage_logs
    FOR SELECT
    TO authenticated
    USING (dm_id = auth.uid());

CREATE POLICY "Service role can manage usage logs"
    ON public.usage_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to clean up old cache entries (run via cron or manually)
CREATE OR REPLACE FUNCTION clean_expired_cache(older_than_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.ai_cache
    WHERE created_at < NOW() - (older_than_hours || ' hours')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
    total_entries BIGINT,
    total_size_mb NUMERIC,
    avg_access_count NUMERIC,
    oldest_entry TIMESTAMPTZ,
    newest_entry TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_entries,
        ROUND((pg_total_relation_size('public.ai_cache')::NUMERIC / 1024 / 1024), 2) as total_size_mb,
        ROUND(AVG(access_count), 2) as avg_access_count,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
    FROM public.ai_cache;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION clean_expired_cache TO service_role;
GRANT EXECUTE ON FUNCTION get_cache_stats TO service_role, authenticated;
