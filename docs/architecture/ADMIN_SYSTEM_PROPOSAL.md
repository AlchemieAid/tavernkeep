# Admin System Proposal - TavernKeep

## Executive Summary

Proposal for a secure, performant admin system to manage application configuration and database content via the frontend. This system will allow authorized administrators to modify rate limits, field constraints, feature flags, and view/edit database records without code deployments.

---

## 🎯 Goals

1. **Dynamic Configuration** - Modify app settings without code changes
2. **Database Management** - View and edit records with proper validation
3. **Security First** - Role-based access control with audit logging
4. **Zero Performance Impact** - Cached configs, lazy loading, separate routes
5. **Developer Experience** - Clear UI, validation, rollback capabilities

---

## 🔐 Security Architecture

### **Role-Based Access Control (RBAC)**

#### Database Schema
```sql
-- Add admin role to users table
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS app_metadata JSONB DEFAULT '{}';

-- Create admin_users table for explicit admin management
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'config_admin', 'data_admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, role)
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id) WHERE is_active = true;

-- RLS Policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

CREATE POLICY "Users can view their own admin status"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid() AND is_active = true);
```

#### Role Definitions
- **`super_admin`** - Full access to all admin functions, can grant/revoke admin roles
- **`config_admin`** - Can modify app configuration (rate limits, field limits, feature flags)
- **`data_admin`** - Can view and edit database records (campaigns, shops, items, etc.)

#### Middleware Protection
```typescript
// middleware/admin-check.ts
export async function requireAdmin(
  role: 'super_admin' | 'config_admin' | 'data_admin' = 'super_admin'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: adminStatus } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!adminStatus) {
    redirect('/unauthorized')
  }

  // Check role hierarchy
  if (role === 'super_admin' && adminStatus.role !== 'super_admin') {
    redirect('/unauthorized')
  }

  return { user, adminRole: adminStatus.role }
}
```

---

## 📊 Configurable Settings

### **1. Rate Limits** (High Priority)
Currently hardcoded in `lib/rate-limit.ts`:
```typescript
const RATE_LIMITS = {
  campaign: { maxRequests: 10, windowMinutes: 60 },
  town: { maxRequests: 50, windowMinutes: 60 },
  shop: { maxRequests: 100, windowMinutes: 60 },
  item: { maxRequests: 200, windowMinutes: 60 },
}
```

**Proposed:**
```sql
CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'rate_limits', 'field_limits', 'features', 'ai'
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

-- Insert default rate limits
INSERT INTO app_config (key, value, description, category) VALUES
  ('rate_limit_campaign', '{"maxRequests": 10, "windowMinutes": 60}', 'Campaign generation rate limit', 'rate_limits'),
  ('rate_limit_town', '{"maxRequests": 50, "windowMinutes": 60}', 'Town generation rate limit', 'rate_limits'),
  ('rate_limit_shop', '{"maxRequests": 100, "windowMinutes": 60}', 'Shop generation rate limit', 'rate_limits'),
  ('rate_limit_item', '{"maxRequests": 200, "windowMinutes": 60}', 'Item generation rate limit', 'rate_limits');
```

### **2. Field Limits** (Medium Priority)
Currently in `lib/constants/field-limits.ts` - 54 different limits.

**Benefits of making configurable:**
- Adjust limits based on AI model capabilities
- A/B test different content lengths
- Respond to user feedback without deployment

### **3. Feature Flags** (Medium Priority)
```sql
INSERT INTO app_config (key, value, description, category) VALUES
  ('feature_ai_generation', 'true', 'Enable AI generation features', 'features'),
  ('feature_public_shops', 'true', 'Enable public shop QR codes', 'features'),
  ('feature_shopping_cart', 'true', 'Enable player shopping cart', 'features'),
  ('feature_hierarchical_gen', 'true', 'Enable full campaign hierarchy generation', 'features');
```

### **4. AI Configuration** (Low Priority)
```sql
INSERT INTO app_config (key, value, description, category) VALUES
  ('ai_model_default', '"gpt-4o"', 'Default OpenAI model', 'ai'),
  ('ai_temperature', '0.7', 'AI creativity temperature', 'ai'),
  ('ai_max_retries', '3', 'Max retry attempts for AI calls', 'ai'),
  ('ai_timeout_ms', '30000', 'AI request timeout in milliseconds', 'ai');
```

---

## 🚀 Performance Strategy

### **1. Configuration Caching**

```typescript
/**
 * Config Cache with TTL
 * - 5-minute cache for config values
 * - Survives warm serverless invocations
 * - Invalidated on admin updates
 */
const configCache = new Map<string, { value: any; expiresAt: number }>()
const CONFIG_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  // Check cache first
  const cached = configCache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value as T
  }

  // Fetch from DB
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .single()

  const value = data?.value ?? defaultValue
  configCache.set(key, { value, expiresAt: Date.now() + CONFIG_TTL_MS })
  
  return value as T
}

// Invalidate cache when config is updated
export function invalidateConfigCache(key?: string) {
  if (key) {
    configCache.delete(key)
  } else {
    configCache.clear()
  }
}
```

### **2. Lazy Loading**
- Admin routes use dynamic imports
- Admin UI components code-split
- No admin code loaded for regular users

### **3. Separate Route Prefix**
```
/admin/*           - All admin routes (protected)
/api/admin/*       - Admin API endpoints (protected)
```

### **4. Read-Only Replicas** (Future)
- Admin queries use read replica
- Doesn't impact production write performance

---

## 🎨 Admin UI Structure

### **Route Structure**
```
/admin
  /dashboard          - Overview, stats, recent changes
  /config
    /rate-limits      - Adjust rate limits
    /field-limits     - Adjust field length limits
    /features         - Toggle feature flags
    /ai               - AI model settings
  /data
    /campaigns        - View/edit campaigns
    /towns            - View/edit towns
    /shops            - View/edit shops
    /items            - View/edit items
    /users            - View user activity
  /audit              - Audit log of all admin actions
  /admins             - Manage admin users (super_admin only)
```

### **Admin Dashboard Components**

#### 1. **Config Editor**
```typescript
/**
 * Generic config editor with validation
 * - JSON schema validation
 * - Preview before save
 * - Rollback to previous version
 * - Diff view for changes
 */
<ConfigEditor
  category="rate_limits"
  key="rate_limit_campaign"
  schema={rateLimitSchema}
  onSave={handleSave}
/>
```

#### 2. **Data Browser**
```typescript
/**
 * Filterable, paginated data browser
 * - Search and filter
 * - Inline editing with validation
 * - Bulk operations
 * - Export to CSV
 */
<DataBrowser
  table="campaigns"
  columns={campaignColumns}
  filters={campaignFilters}
  onEdit={handleEdit}
/>
```

#### 3. **Audit Log Viewer**
```typescript
/**
 * Comprehensive audit trail
 * - Who changed what, when
 * - Before/after values
 * - Filterable by user, action, date
 * - Rollback capability
 */
<AuditLog
  filters={{ category: 'config', user: userId }}
  onRollback={handleRollback}
/>
```

---

## 📝 Audit Logging

### **Schema**
```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'config_update', 'data_edit', 'admin_grant', etc.
  entity_type TEXT NOT NULL, -- 'app_config', 'campaigns', 'admin_users', etc.
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at DESC);
```

### **Automatic Logging**
```typescript
/**
 * Log all admin actions automatically
 */
export async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string,
  oldValue: any,
  newValue: any
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  await supabase.from('admin_audit_log').insert({
    admin_user_id: user!.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue,
  })
  
  // Also invalidate config cache if config was changed
  if (entityType === 'app_config') {
    invalidateConfigCache(entityId)
  }
}
```

---

## 🔄 Migration Strategy

### **Phase 1: Foundation** (Week 1)
1. Create admin tables (admin_users, app_config, admin_audit_log)
2. Add admin middleware and auth helpers
3. Create admin layout and dashboard shell
4. Implement config caching layer

### **Phase 2: Config Management** (Week 2)
1. Migrate rate limits to database
2. Build rate limit config editor
3. Add field limits config (optional)
4. Implement feature flags

### **Phase 3: Data Management** (Week 3)
1. Build generic data browser component
2. Add campaign/town/shop viewers
3. Implement inline editing with validation
4. Add bulk operations

### **Phase 4: Polish** (Week 4)
1. Audit log viewer with rollback
2. Admin user management UI
3. Export/import functionality
4. Documentation and training

---

## 🛡️ Security Checklist

- [ ] Admin routes protected by middleware
- [ ] API endpoints verify admin role
- [ ] All admin actions logged to audit table
- [ ] Config changes require confirmation
- [ ] Data edits validate against schemas
- [ ] Rate limit admin API endpoints
- [ ] CSRF protection on all forms
- [ ] Admin sessions expire after 1 hour
- [ ] 2FA required for super_admin (future)
- [ ] IP allowlist for admin access (optional)

---

## 📈 Performance Impact Analysis

### **Before (Current State)**
- Config: Hardcoded constants (0ms lookup)
- No admin overhead
- No additional DB tables

### **After (With Admin System)**
- Config: 5-min cached DB lookup (1ms cached, 50ms uncached)
- Admin routes: Lazy loaded, no impact on regular users
- Additional tables: 3 (admin_users, app_config, admin_audit_log)
- **Estimated overhead for regular users: <1ms per request**

### **Optimization Strategies**
1. **Config caching** - 5-minute TTL reduces DB hits
2. **Lazy loading** - Admin code not loaded for regular users
3. **Separate routes** - No middleware overhead on public routes
4. **Indexed queries** - All admin queries use proper indexes
5. **Read replicas** - Admin queries can use replica (future)

---

## 🎯 Recommended Approach

### **Option A: Full System** (Recommended)
- All features from proposal
- Estimated: 3-4 weeks development
- Best for long-term maintainability

### **Option B: Config-Only** (Quick Win)
- Just rate limits and feature flags
- No data browser
- Estimated: 1 week development
- Good for immediate needs

### **Option C: Hybrid** (Balanced)
- Config management + basic data viewer
- No inline editing, just view/search
- Estimated: 2 weeks development
- Good balance of features and time

---

## 💡 Next Steps

1. **Review this proposal** - Discuss approach and priorities
2. **Choose implementation option** - Full, Config-Only, or Hybrid
3. **Set up admin infrastructure** - Database tables and middleware
4. **Build incrementally** - Start with highest-value features
5. **Test thoroughly** - Security and performance testing

---

## 📚 Technical Stack

- **Frontend**: React Server Components + Client Components
- **Styling**: TailwindCSS (matching existing design system)
- **Forms**: react-hook-form + Zod validation
- **Data Tables**: TanStack Table (or similar)
- **Auth**: Supabase RLS + middleware checks
- **Caching**: In-memory Map with TTL
- **Audit**: PostgreSQL JSONB for flexible logging

---

## ❓ Questions to Answer

1. **Who should be the first super_admin?** (Your user ID)
2. **Which configs are highest priority?** (Rate limits? Field limits? Features?)
3. **Do you need data editing or just viewing?**
4. **Should we implement rollback functionality?**
5. **Any specific security requirements?** (IP allowlist, 2FA, etc.)
6. **Preferred implementation timeline?** (Fast vs comprehensive)

---

**Ready to proceed?** Let me know which approach you prefer and I'll start building! 🚀
