# TavernKeep Admin System

Complete administrative interface for managing application configuration, users, and data.

## 🎯 Overview

The admin system provides a secure, full-featured interface for managing all aspects of the TavernKeep application without touching code or database directly.

## 🏗️ Architecture

The admin layer is built around four small, composable modules in `lib/admin/`:

| Module | Responsibility |
| --- | --- |
| `auth.ts` | Role check (`requireAdmin`, `checkAdminStatus`). All routes call this **first**. |
| `supabase-admin.ts` | Service-role Supabase client. Bypasses RLS so admins can see/edit data across all users. Used **only after** an auth check. |
| `schema-registry.ts` | Single source of truth for tables exposed in the data browser. Curated entries + auto-discovery via the `admin_list_public_tables()` RPC. New tables appear automatically. |
| `config-schemas.ts` | Per-key Zod schemas. Drives both server-side validation in the config API and client-side widget selection (boolean / number / string / json). |
| `audit.ts` | Records every admin action (success **and** failure). Uses the service-role client so RLS can never silently drop a log entry. |
| `config.ts` | Cached, typed `getConfig` plus `updateConfig`. `getConfigRaw` reads bypass cache for capturing pre-change values for the audit log. |

### Required environment variable

```
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, never NEXT_PUBLIC_
```

If absent, the data browser renders a "Configuration required" notice and audit log writes silently fall back to the user-session client. See `.env.example`.

### Adding a new table to the data browser

Either:
1. Add an entry to `TABLE_REGISTRY` in `lib/admin/schema-registry.ts` for a curated label / icon / category, or
2. Do nothing — the table appears under "Other" automatically via `discoverTables()`.

### Adding a new app-config key

1. Insert the row into `app_config` (migration or via the admin UI).
2. Add a schema entry in `lib/admin/config-schemas.ts` so writes are validated and the editor renders the right widget.

### Tests

| File | What it covers |
| --- | --- |
| `__tests__/admin/schema-registry.test.ts` | Registry shape, fallback resolution, category grouping. |
| `__tests__/admin/config-schemas.test.ts` | Per-key validation, widget kinds, defaults. |
| `__tests__/admin/supabase-admin.test.ts` | Service-role client guard rails (missing env vars, singleton). |
| `__tests__/admin/security.test.ts` | RLS enforcement on admin tables for non-admin users. |
| `__tests__/security/env-vars.test.ts` | Service-role key never reaches client bundles. |

## 🔐 Access Levels

### Super Admin (`super_admin`)
- **Full system access**
- Manage all configuration
- View and edit all data
- Grant/revoke admin roles
- View complete audit log

### Config Admin (`config_admin`)
- Modify application configuration
- Manage feature flags
- Update rate limits
- View audit log

### Data Admin (`data_admin`)
- Browse database records
- View all tables
- Export data
- View audit log

## 📊 Features

### 1. Dashboard (`/admin`)
- **System Statistics**
  - Total admin actions
  - Configuration items count
  - Active administrators
  - Cache performance

- **Recent Activity**
  - Last 24 hours of admin actions
  - Action breakdown by type

- **System Health**
  - Database status
  - Config cache status
  - Failed actions monitoring
  - RLS policy enforcement

- **Quick Actions**
  - Direct links to common tasks

### 2. Configuration Management (`/admin/config`)
- **View All Settings**
  - Organized by category
  - Rate limits
  - Feature flags
  - AI settings
  - System configuration

- **Edit Configuration**
  - Inline JSON editing
  - Validation before save
  - Version tracking
  - Automatic cache invalidation

- **Categories**
  - `rate_limits` - API rate limiting
  - `features` - Feature toggles
  - `ai` - AI model settings
  - `system` - System-wide config
  - `field_limits` - Field constraints

### 3. Audit Log (`/admin/audit`)
- **Complete Activity Trail**
  - All admin actions logged
  - Success/failure tracking
  - Before/after values
  - IP address and user agent

- **Advanced Filtering**
  - Search by action, entity, or ID
  - Filter by action type
  - Filter by success/failure
  - Real-time results

- **Detailed View**
  - Expandable log entries
  - JSON diff display
  - Full context for each action

### 4. User Management (`/admin/users`)
- **Grant Admin Access**
  - Add new administrators
  - Select role level
  - Add notes for tracking

- **Revoke Access**
  - Remove admin privileges
  - Confirmation required
  - Cannot revoke own access

- **View Active Admins**
  - All current administrators
  - Role and grant date
  - Granted by tracking

### 5. Data Browser (`/admin/data`)
- **Browse All Tables**
  - 17 database tables
  - Record counts
  - Search and filter

- **View Records**
  - Up to 100 records per table
  - JSON expansion for complex fields
  - Formatted display

- **Tables Available**
  - Campaigns, Towns, Shops
  - Items and Item Library
  - Characters and Players
  - AI Usage and Logs
  - Admin tables

## 🚀 Getting Started

### First Time Setup

1. **Migration Applied** ✅
   ```bash
   # Already completed via MCP
   ```

2. **Super Admin Created** ✅
   ```sql
   -- Your user already has super_admin access
   ```

3. **Access Admin Panel**
   ```
   Navigate to: /admin
   ```

### Granting Admin Access

1. Go to `/admin/users`
2. Click "Grant Access"
3. Enter user UUID from Supabase Auth
4. Select role (super_admin, config_admin, or data_admin)
5. Add optional notes
6. Click "Grant Access"

### Editing Configuration

1. Go to `/admin/config`
2. Find the config you want to edit
3. Click the edit button
4. Modify the JSON value
5. Click "Save"
6. Cache automatically invalidates

### Viewing Audit Log

1. Go to `/admin/audit`
2. Use search to find specific actions
3. Filter by action type or status
4. Click expand to see full details

### Browsing Data

1. Go to `/admin/data`
2. Select a table from the left
3. View records in the table
4. Click "View JSON" for complex fields
5. Click "Refresh" to reload data

## 🔒 Security

### Authentication
- All routes protected by admin middleware
- Checks active admin status
- Redirects unauthorized users to `/unauthorized`

### Authorization
- Role-based access control (RBAC)
- Super admins can access everything
- Config admins limited to configuration
- Data admins limited to data viewing

### Audit Trail
- Every action logged automatically
- IP address and user agent captured
- Before/after values stored
- Success/failure tracking

### RLS Policies
- Row Level Security enforced
- Super admins can manage admin_users
- Users can view own admin status
- Anyone can read config (needed for app)
- Only admins can modify config
- Only admins can view audit log

## 📝 Configuration Reference

### Rate Limits
```json
{
  "rate_limit_campaign": {
    "maxRequests": 10,
    "windowMinutes": 60
  },
  "rate_limit_town": {
    "maxRequests": 50,
    "windowMinutes": 60
  },
  "rate_limit_shop": {
    "maxRequests": 100,
    "windowMinutes": 60
  },
  "rate_limit_item": {
    "maxRequests": 200,
    "windowMinutes": 60
  }
}
```

### Feature Flags
```json
{
  "feature_ai_generation": true,
  "feature_public_shops": true,
  "feature_shopping_cart": true,
  "feature_hierarchical_gen": true,
  "feature_admin_panel": true
}
```

### AI Settings
```json
{
  "ai_model_default": "gpt-4o",
  "ai_temperature": 0.7,
  "ai_max_retries": 3,
  "ai_timeout_ms": 30000
}
```

### System Settings
```json
{
  "system_maintenance_mode": false,
  "system_cache_ttl_seconds": 300
}
```

## 🛠️ Technical Details

### File Structure
```
/app/admin/
  ├── layout.tsx          # Protected admin layout
  ├── page.tsx            # Dashboard
  ├── config/page.tsx     # Configuration management
  ├── audit/page.tsx      # Audit log viewer
  ├── users/page.tsx      # User management
  └── data/page.tsx       # Data browser

/components/admin/
  ├── config-editor.tsx       # Config editing UI
  ├── audit-log-viewer.tsx    # Audit log UI
  ├── admin-user-manager.tsx  # User management UI
  └── data-browser.tsx        # Data browsing UI

/lib/admin/
  ├── auth.ts    # Authentication & authorization
  ├── config.ts  # Configuration management
  ├── audit.ts   # Audit logging
  └── index.ts   # Exports

/app/api/admin/
  ├── config/route.ts         # Config update API
  ├── users/grant/route.ts    # Grant admin role
  ├── users/revoke/route.ts   # Revoke admin role
  └── data/[table]/route.ts   # Data fetching API
```

### Database Tables
- `admin_users` - Admin role assignments
- `app_config` - Application configuration
- `admin_audit_log` - Complete audit trail
- `app_config_history` - Config version history

### Helper Functions
- `is_admin(user_id, role)` - Check admin status
- `get_config(key, fallback)` - Get config value

### Caching
- 5-minute TTL on config cache
- Automatic invalidation on update
- In-memory cache for performance

## 📖 Usage Examples

### Check if Feature is Enabled
```typescript
import { getConfig } from '@/lib/admin/config'

const aiEnabled = await getConfig('feature_ai_generation', false)
if (aiEnabled) {
  // AI generation is enabled
}
```

### Get Rate Limit
```typescript
import { getConfig } from '@/lib/admin/config'

const limit = await getConfig('rate_limit_campaign', { 
  maxRequests: 10, 
  windowMinutes: 60 
})
```

### Check Admin Status
```typescript
import { checkAdminStatus, isSuperAdmin } from '@/lib/admin/auth'

const adminStatus = await checkAdminStatus()
if (adminStatus) {
  console.log(`User is ${adminStatus.role}`)
}

const isSuperAdminUser = await isSuperAdmin()
if (isSuperAdminUser) {
  // User has full admin access
}
```

### Log Admin Action
```typescript
import { logAdminAction } from '@/lib/admin/audit'

await logAdminAction(
  'config_update',
  'app_config',
  'rate_limit_campaign',
  oldValue,
  newValue
)
```

## 🎨 Design System

- **Colors**
  - Purple: Super Admin
  - Blue: Config Admin / Config actions
  - Green: Data Admin / Success
  - Red: Failures / Deletions
  - Yellow: Rate limits / Warnings
  - Gray: System / Neutral

- **Icons**
  - Lucide icons throughout
  - Consistent sizing (h-4 w-4 for small, h-5 w-5 for medium)
  - Color-coded by category

- **Components**
  - shadcn/ui component library
  - Tailwind CSS for styling
  - Responsive design
  - Dark sidebar navigation

## ⚠️ Important Notes

1. **Cannot Revoke Own Access**
   - Safety feature to prevent lockout
   - Must use another super admin

2. **All Actions Logged**
   - Every change tracked in audit log
   - IP and user agent captured
   - Cannot be disabled

3. **Cache Invalidation**
   - Config cache auto-clears on update
   - 5-minute TTL for performance
   - Manual refresh available

4. **RLS Always Enforced**
   - Row Level Security cannot be bypassed
   - Even admins subject to policies
   - Security by design

## 🐛 Troubleshooting

### Can't Access Admin Panel
- Check you have an active admin role
- Verify `is_active = true` in `admin_users`
- Check you're logged in

### Config Changes Not Applying
- Wait up to 5 minutes for cache to expire
- Or restart the application
- Check audit log for errors

### User Can't Be Granted Admin
- Verify user exists in `auth.users`
- Check user UUID is correct
- Ensure you're a super admin

## 📚 Additional Resources

- [Admin System Proposal](./ADMIN_SYSTEM_PROPOSAL.md) - Full technical spec
- [Migration File](./supabase/migrations/20260416000000_create_admin_system.sql) - Database schema
- [Supabase Docs](https://supabase.com/docs) - Supabase documentation


## ✅ Checklist

- [x] Database schema created
- [x] Migration applied
- [x] Super admin user created
- [x] Admin layout and navigation
- [x] Dashboard with statistics
- [x] Configuration editor
- [x] Audit log viewer
- [x] User management
- [x] Data browser
- [x] API routes secured
- [x] RLS policies enforced
- [x] Documentation complete

---

**Admin System Version:** 1.0.0  
**Last Updated:** April 16, 2026  
**Status:** Production Ready ✅
