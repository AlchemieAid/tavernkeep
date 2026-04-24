-- Admin Schema Discovery Function
--
-- Returns the names of all base tables in the `public` schema.
-- Used by the admin data browser to auto-discover tables added by
-- future migrations, so the UI never silently goes stale.
--
-- Security: SECURITY DEFINER + restricted to the service_role.
-- The application layer (lib/admin/auth.ts) gates who can call this
-- via the service-role client.

CREATE OR REPLACE FUNCTION public.admin_list_public_tables()
RETURNS TABLE (table_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

-- Restrict to service_role only. The function is invoked exclusively by
-- the admin service-role client, never by anonymous or authenticated users.
REVOKE ALL ON FUNCTION public.admin_list_public_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_public_tables() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_public_tables() TO service_role;

COMMENT ON FUNCTION public.admin_list_public_tables() IS
  'Lists base tables in the public schema for the admin data browser. Service role only.';
