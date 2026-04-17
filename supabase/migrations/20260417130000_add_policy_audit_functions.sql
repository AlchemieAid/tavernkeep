-- Add Policy Audit Functions for Security Testing
--
-- These functions allow automated tests to query RLS policies
-- and detect dangerous patterns without requiring test users.

-- Function to get all RLS policies in the public schema
CREATE OR REPLACE FUNCTION get_all_policies()
RETURNS TABLE (
  schemaname name,
  tablename name,
  policyname name,
  cmd text,
  qual text,
  with_check text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    schemaname::name,
    tablename::name,
    policyname::name,
    cmd::text,
    qual::text,
    with_check::text
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY tablename, cmd, policyname;
$$;

-- Function to get policies for a specific table
CREATE OR REPLACE FUNCTION get_table_policies(table_name text)
RETURNS TABLE (
  policyname name,
  cmd text,
  qual text,
  with_check text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    policyname::name,
    cmd::text,
    qual::text,
    with_check::text
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename = table_name
  ORDER BY cmd, policyname;
$$;

-- Function to find dangerous policy patterns
CREATE OR REPLACE FUNCTION get_dangerous_policies()
RETURNS TABLE (
  tablename name,
  policyname name,
  cmd text,
  qual text,
  issue text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    tablename::name,
    policyname::name,
    cmd::text,
    qual::text,
    CASE
      WHEN qual LIKE '%IS NOT NULL%' THEN 'Uses IS NOT NULL as security condition'
      WHEN qual = 'true' THEN 'Always allows access (qual = true)'
      WHEN qual LIKE '%1=1%' THEN 'Always allows access (1=1)'
      WHEN qual LIKE '%NOT (false)%' THEN 'Always allows access (NOT false)'
      ELSE 'Unknown dangerous pattern'
    END::text as issue
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND (
      qual LIKE '%IS NOT NULL%'
      OR qual = 'true'
      OR qual LIKE '%1=1%'
      OR qual LIKE '%NOT (false)%'
    )
  ORDER BY tablename, policyname;
$$;

-- Function to verify DM-owned tables have proper auth checks
CREATE OR REPLACE FUNCTION verify_dm_table_security()
RETURNS TABLE (
  tablename text,
  has_select_policy boolean,
  has_auth_check boolean,
  has_dm_id_check boolean,
  status text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  dm_tables text[] := ARRAY['campaigns', 'towns', 'shops', 'notable_people', 'item_library'];
  tbl text;
  select_count int;
  auth_count int;
  dm_id_count int;
BEGIN
  FOREACH tbl IN ARRAY dm_tables
  LOOP
    -- Count SELECT policies
    SELECT COUNT(*) INTO select_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND pg_policies.tablename = tbl
      AND cmd = 'SELECT';
    
    -- Count policies with auth.uid() check
    SELECT COUNT(*) INTO auth_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND pg_policies.tablename = tbl
      AND cmd = 'SELECT'
      AND qual LIKE '%auth.uid()%';
    
    -- Count policies with dm_id check
    SELECT COUNT(*) INTO dm_id_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND pg_policies.tablename = tbl
      AND cmd = 'SELECT'
      AND (qual LIKE '%dm_id%' OR qual LIKE '%= dm_id%');
    
    RETURN QUERY SELECT 
      tbl,
      select_count > 0,
      auth_count > 0,
      dm_id_count > 0,
      CASE
        WHEN select_count = 0 THEN 'ERROR: No SELECT policy'
        WHEN auth_count = 0 THEN 'ERROR: No auth.uid() check'
        WHEN dm_id_count = 0 THEN 'ERROR: No dm_id check'
        ELSE 'OK'
      END;
  END LOOP;
END;
$$;

-- Grant execute permissions to authenticated users (for tests)
GRANT EXECUTE ON FUNCTION get_all_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_policies(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dangerous_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_dm_table_security() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_all_policies() IS 'Returns all RLS policies in the public schema for security auditing';
COMMENT ON FUNCTION get_table_policies(text) IS 'Returns RLS policies for a specific table';
COMMENT ON FUNCTION get_dangerous_policies() IS 'Detects dangerous RLS policy patterns that could cause data leakage';
COMMENT ON FUNCTION verify_dm_table_security() IS 'Verifies that DM-owned tables have proper auth.uid() and dm_id checks';
