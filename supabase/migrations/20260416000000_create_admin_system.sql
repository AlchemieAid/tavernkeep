-- ============================================================
-- Admin System - Phase 1: Database Schema
-- ============================================================
-- Creates tables and policies for admin functionality:
-- - admin_users: Role-based access control
-- - app_config: Dynamic application configuration
-- - admin_audit_log: Comprehensive audit trail
-- ============================================================

-- ============================================================
-- 1. Admin Users Table
-- ============================================================
-- Manages admin roles and permissions
-- Supports role hierarchy: super_admin > config_admin, data_admin

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'config_admin', 'data_admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id) WHERE is_active = true;
CREATE INDEX idx_admin_users_role ON admin_users(role) WHERE is_active = true;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all admin users
CREATE POLICY "super_admins_manage_all"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

-- Users can view their own admin status
CREATE POLICY "users_view_own_status"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid() AND is_active = true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

COMMENT ON TABLE admin_users IS 'Admin user roles and permissions for system management';
COMMENT ON COLUMN admin_users.role IS 'Admin role: super_admin (full access), config_admin (config only), data_admin (data only)';
COMMENT ON COLUMN admin_users.granted_by IS 'User ID of admin who granted this role';

-- ============================================================
-- 2. App Configuration Table
-- ============================================================
-- Stores dynamic application configuration
-- Supports versioning and rollback

CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('rate_limits', 'field_limits', 'features', 'ai', 'system')),
  schema JSONB, -- JSON schema for validation
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_config_category ON app_config(category);
CREATE INDEX idx_app_config_key ON app_config(key);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config (needed for app functionality)
CREATE POLICY "anyone_read_config"
  ON app_config FOR SELECT
  USING (true);

-- Only config_admin and super_admin can modify
CREATE POLICY "admins_modify_config"
  ON app_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role IN ('super_admin', 'config_admin')
      AND au.is_active = true
    )
  );

COMMENT ON TABLE app_config IS 'Dynamic application configuration with versioning';
COMMENT ON COLUMN app_config.schema IS 'JSON schema for validating the value field';
COMMENT ON COLUMN app_config.version IS 'Incremented on each update for change tracking';

-- ============================================================
-- 3. Admin Audit Log Table
-- ============================================================
-- Comprehensive audit trail of all admin actions

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'config_update', 'data_edit', 'admin_grant', etc.
  entity_type TEXT NOT NULL, -- 'app_config', 'campaigns', 'admin_users', etc.
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action);

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit log
CREATE POLICY "admins_view_audit_log"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- System can insert audit logs (via service role or triggers)
CREATE POLICY "system_insert_audit_log"
  ON admin_audit_log FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE admin_audit_log IS 'Audit trail of all admin actions for compliance and debugging';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action performed (config_update, data_edit, etc.)';
COMMENT ON COLUMN admin_audit_log.entity_type IS 'Type of entity modified (app_config, campaigns, etc.)';

-- ============================================================
-- 4. Insert Default Configuration
-- ============================================================

-- Rate Limits
INSERT INTO app_config (key, value, description, category, schema) VALUES
  ('rate_limit_campaign', '{"maxRequests": 10, "windowMinutes": 60}', 'Campaign generation rate limit', 'rate_limits', '{"type": "object", "properties": {"maxRequests": {"type": "number"}, "windowMinutes": {"type": "number"}}}'),
  ('rate_limit_town', '{"maxRequests": 50, "windowMinutes": 60}', 'Town generation rate limit', 'rate_limits', '{"type": "object", "properties": {"maxRequests": {"type": "number"}, "windowMinutes": {"type": "number"}}}'),
  ('rate_limit_shop', '{"maxRequests": 100, "windowMinutes": 60}', 'Shop generation rate limit', 'rate_limits', '{"type": "object", "properties": {"maxRequests": {"type": "number"}, "windowMinutes": {"type": "number"}}}'),
  ('rate_limit_item', '{"maxRequests": 200, "windowMinutes": 60}', 'Item generation rate limit', 'rate_limits', '{"type": "object", "properties": {"maxRequests": {"type": "number"}, "windowMinutes": {"type": "number"}}}')
ON CONFLICT (key) DO NOTHING;

-- Feature Flags
INSERT INTO app_config (key, value, description, category) VALUES
  ('feature_ai_generation', 'true', 'Enable AI generation features', 'features'),
  ('feature_public_shops', 'true', 'Enable public shop QR codes and access', 'features'),
  ('feature_shopping_cart', 'true', 'Enable player shopping cart functionality', 'features'),
  ('feature_hierarchical_gen', 'true', 'Enable full campaign hierarchy generation', 'features'),
  ('feature_admin_panel', 'true', 'Enable admin panel access', 'features')
ON CONFLICT (key) DO NOTHING;

-- AI Configuration
INSERT INTO app_config (key, value, description, category) VALUES
  ('ai_model_default', '"gpt-4o"', 'Default OpenAI model for generation', 'ai'),
  ('ai_temperature', '0.7', 'AI creativity temperature (0.0-2.0)', 'ai'),
  ('ai_max_retries', '3', 'Maximum retry attempts for AI calls', 'ai'),
  ('ai_timeout_ms', '30000', 'AI request timeout in milliseconds', 'ai')
ON CONFLICT (key) DO NOTHING;

-- System Configuration
INSERT INTO app_config (key, value, description, category) VALUES
  ('system_maintenance_mode', 'false', 'Enable maintenance mode (disables all generation)', 'system'),
  ('system_cache_ttl_seconds', '300', 'Config cache TTL in seconds', 'system')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. Helper Functions
-- ============================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID, required_role TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF required_role IS NULL THEN
    -- Check if user has any active admin role
    RETURN EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = is_admin.user_id
      AND is_active = true
    );
  ELSE
    -- Check if user has specific role
    RETURN EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = is_admin.user_id
      AND role = required_role
      AND is_active = true
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get config value with fallback
CREATE OR REPLACE FUNCTION get_config(config_key TEXT, fallback JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  config_value JSONB;
BEGIN
  SELECT value INTO config_value
  FROM app_config
  WHERE key = config_key;
  
  RETURN COALESCE(config_value, fallback);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_config TO authenticated, anon;

COMMENT ON FUNCTION is_admin IS 'Check if user has admin role (optionally specific role)';
COMMENT ON FUNCTION get_config IS 'Get config value with optional fallback';

-- ============================================================
-- 6. Config Version History (for rollback)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES app_config(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  old_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL
);

CREATE INDEX idx_config_history_config_id ON app_config_history(config_id);
CREATE INDEX idx_config_history_changed_at ON app_config_history(changed_at DESC);

-- Enable RLS
ALTER TABLE app_config_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view history
CREATE POLICY "admins_view_config_history"
  ON app_config_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- Trigger to record config changes
CREATE OR REPLACE FUNCTION record_config_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO app_config_history (config_id, key, old_value, new_value, changed_by, version)
    VALUES (NEW.id, NEW.key, OLD.value, NEW.value, NEW.updated_by, NEW.version);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_config_change_trigger
  AFTER UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION record_config_change();

COMMENT ON TABLE app_config_history IS 'Version history of config changes for rollback capability';

-- ============================================================
-- Complete!
-- ============================================================
-- Next steps:
-- 1. Run this migration: npx supabase db push
-- 2. Create first super_admin user manually
-- 3. Build admin middleware and UI
-- ============================================================
