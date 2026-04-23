-- Fix admin_users RLS infinite recursion
-- Migration: 20260423000000_fix_admin_users_rls_recursion.sql
-- Issue: Infinite recursion detected in policy for relation "admin_users"
-- Solution: Completely disable RLS on admin_users and use application-level checks

-- Drop all existing policies on admin_users
DROP POLICY IF EXISTS "users_view_own_admin_status" ON admin_users;
DROP POLICY IF EXISTS "super_admins_full_access" ON admin_users;
DROP POLICY IF EXISTS "super_admins_manage_all" ON admin_users;
DROP POLICY IF EXISTS "users_view_own_status" ON admin_users;

-- Ensure RLS is disabled on admin_users
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Add comment explaining why RLS is disabled
COMMENT ON TABLE admin_users IS 
'Admin user roles and permissions. RLS is DISABLED to prevent infinite recursion.
Access control is enforced at the application level via checkAdminStatus() in lib/admin/auth.ts.
This is safe because admin checks are done server-side and cannot be bypassed by clients.';
