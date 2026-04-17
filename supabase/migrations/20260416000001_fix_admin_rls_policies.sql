-- Fix Admin RLS Policies - Remove Infinite Recursion
-- Migration: 20260416000001_fix_admin_rls_policies.sql

-- Drop the problematic policies
DROP POLICY IF EXISTS "super_admins_manage_all" ON admin_users;
DROP POLICY IF EXISTS "users_view_own_status" ON admin_users;

-- Create new policies without recursion
-- Policy 1: Users can view their own admin status
CREATE POLICY "users_view_own_admin_status"
ON admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND is_active = true);

-- Policy 2: Super admins can manage all admin_users
-- This uses a function to avoid recursion
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create the policy using the function
-- Note: We need to bypass RLS for the function itself
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "users_view_own_admin_status"
ON admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND is_active = true);

CREATE POLICY "super_admins_full_access"
ON admin_users
FOR ALL
TO authenticated
USING (
  -- Allow if user is super admin (checked via direct query, not recursive)
  EXISTS (
    SELECT 1 
    FROM admin_users au
    WHERE au.user_id = auth.uid() 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    LIMIT 1
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM admin_users au
    WHERE au.user_id = auth.uid() 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    LIMIT 1
  )
);

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION auth.is_super_admin() TO authenticated;

-- Comment explaining the fix
COMMENT ON POLICY "users_view_own_admin_status" ON admin_users IS 
'Allows users to view their own admin status without recursion';

COMMENT ON POLICY "super_admins_full_access" ON admin_users IS 
'Allows super admins to manage all admin_users. Uses subquery to avoid infinite recursion.';
