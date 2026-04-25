-- Fix admin_users security: drop ALL existing policies and re-enable RLS with
-- a single non-recursive SELECT policy.
-- Migration: 20260425000000_fix_admin_users_security.sql
--
-- Previous migrations accumulated policies with different names, some of which
-- used EXISTS(SELECT 1 FROM admin_users ...) inside admin_users policies —
-- a self-reference that triggers infinite recursion (Postgres error 42P17).
--
-- Strategy: dynamically drop every policy on the table regardless of name,
-- then create one safe policy using auth.uid() directly (no sub-query).
--
-- After this migration:
--   SELECT  : authenticated users see only their own row; anon sees nothing
--   INSERT/UPDATE/DELETE : service_role only (bypasses RLS automatically)
--   Application writes  : always go through lib/admin/supabase-admin.ts

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON admin_users', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Non-recursive: auth.uid() is a built-in function, not a sub-query on admin_users.
CREATE POLICY "users_view_own_admin_status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

COMMENT ON TABLE admin_users IS
'Admin user roles and permissions. RLS enabled with single non-recursive policy.
Authenticated users can read their own row. All writes require service_role.
See lib/admin/supabase-admin.ts for the service-role client used by admin routes.';
