-- Disable RLS on admin_users to prevent infinite recursion
-- Migration: 20260416000002_disable_admin_users_rls.sql

-- The admin_users table had infinite recursion issues with RLS policies
-- because checking if a user is admin requires querying admin_users,
-- which triggers the RLS policy again.
--
-- Solution: Disable RLS on admin_users and rely on application-level checks.
-- The admin routes and API endpoints already verify admin status,
-- so RLS is redundant here.

-- Drop all existing policies
DROP POLICY IF EXISTS "users_view_own_admin_status" ON admin_users;
DROP POLICY IF EXISTS "super_admins_full_access" ON admin_users;
DROP POLICY IF EXISTS "super_admins_manage_all" ON admin_users;
DROP POLICY IF EXISTS "users_view_own_status" ON admin_users;

-- Disable RLS on admin_users
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Add comment explaining why RLS is disabled
COMMENT ON TABLE admin_users IS 
'Admin user roles and permissions. RLS is disabled to prevent infinite recursion. 
Access control is enforced at the application level via checkAdminStatus() and route middleware.';
