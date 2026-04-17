# Admin System Testing Guide

Complete guide for testing the admin system to ensure security and functionality.

## 🎯 Quick Start

### Run All Admin Tests
```bash
npm run test:admin
```

### Run Security Tests Only
```bash
npm run test:admin:security
```

### Run Integration Tests Only
```bash
npm run test:admin:integration
```

### Use Test Runner (Recommended)
```powershell
# PowerShell (Windows)
.\scripts\test-admin-security.ps1

# Bash (Mac/Linux)
./scripts/test-admin-security.sh
```

## 🔐 Critical Security Tests

### 1. RLS Policy Verification

**Test:** Regular users cannot access admin tables
```typescript
// Should return empty array or error
const { data } = await supabase.from('admin_users').select('*')
expect(data).toEqual([])
```

**Test:** Regular users can read public config
```typescript
// Should work - needed for app functionality
const { data } = await supabase.from('app_config').select('*')
expect(data).toBeDefined()
```

**Test:** Regular users cannot modify config
```typescript
// Should fail with RLS error
const { error } = await supabase
  .from('app_config')
  .update({ value: { modified: true } })
expect(error).toBeTruthy()
```

### 2. API Route Protection

**Test:** Admin routes reject non-admin requests
```bash
curl -X PATCH http://localhost:3000/api/admin/config \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":true}'

# Expected: 403 Forbidden
```

**Test:** User management requires super admin
```bash
curl -X POST http://localhost:3000/api/admin/users/grant \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","role":"super_admin"}'

# Expected: 403 Forbidden (unless super admin)
```

### 3. Route Protection

**Test:** Admin pages redirect non-admins
```bash
# Visit /admin without admin session
# Expected: Redirect to /unauthorized
```

**Test:** Unauthorized page is accessible
```bash
# Visit /unauthorized
# Expected: 200 OK, shows error page
```

## 🧪 Manual Testing Checklist

### As Regular User (No Admin Access)

- [ ] **Cannot access `/admin`**
  - Visit `/admin` → Should redirect to `/unauthorized`
  
- [ ] **Cannot call admin APIs**
  - Try PATCH `/api/admin/config` → Should get 403
  - Try POST `/api/admin/users/grant` → Should get 403
  - Try GET `/api/admin/data/campaigns` → Should get 403

- [ ] **Cannot read admin tables**
  ```sql
  SELECT * FROM admin_users;
  -- Should return 0 rows (RLS blocks)
  ```

- [ ] **Cannot modify config**
  ```sql
  UPDATE app_config SET value = '{"test": true}' WHERE key = 'feature_ai_generation';
  -- Should fail with RLS error
  ```

- [ ] **CAN read public config**
  ```sql
  SELECT * FROM app_config;
  -- Should return config rows (needed for app)
  ```

### As Config Admin

- [ ] **Can access admin panel**
  - Visit `/admin` → Should show dashboard
  
- [ ] **Can modify configuration**
  - Go to `/admin/config`
  - Edit a config value
  - Save successfully
  - Verify audit log entry created

- [ ] **Cannot access user management**
  - Visit `/admin/users` → Should redirect to `/unauthorized`
  - Try POST `/api/admin/users/grant` → Should get 403

- [ ] **Can view audit log**
  - Visit `/admin/audit`
  - See own config changes
  - Filter and search work

### As Data Admin

- [ ] **Can access admin panel**
  - Visit `/admin` → Should show dashboard

- [ ] **Can browse data**
  - Go to `/admin/data`
  - Select tables
  - View records
  - Refresh works

- [ ] **Cannot modify configuration**
  - Visit `/admin/config` → Should redirect to `/unauthorized`
  - Try PATCH `/api/admin/config` → Should get 403

- [ ] **Cannot manage users**
  - Visit `/admin/users` → Should redirect to `/unauthorized`

### As Super Admin

- [ ] **Can access all admin routes**
  - `/admin` → Dashboard
  - `/admin/config` → Config editor
  - `/admin/audit` → Audit log
  - `/admin/users` → User management
  - `/admin/data` → Data browser

- [ ] **Can modify configuration**
  - Edit rate limits
  - Toggle features
  - Update AI settings
  - All changes logged

- [ ] **Can manage users**
  - Grant admin role to user
  - Verify user appears in list
  - Revoke admin role
  - Verify user removed
  - Cannot revoke own access

- [ ] **Can view complete audit log**
  - All admin actions visible
  - Filter by action type
  - Filter by success/failure
  - Expand to see details

- [ ] **All actions logged**
  - Every config change → audit log entry
  - Every user grant/revoke → audit log entry
  - IP address captured
  - User agent captured

## 🎨 UI/UX Testing

### Dashboard
- [ ] Statistics display correctly
- [ ] Recent activity shows last 24h
- [ ] System health indicators accurate
- [ ] Quick actions work

### Config Editor
- [ ] All categories display
- [ ] Edit button works
- [ ] JSON validation works
- [ ] Save updates config
- [ ] Cache invalidates
- [ ] Version increments
- [ ] Audit log entry created

### Audit Log
- [ ] Search works
- [ ] Filters work (action, status)
- [ ] Expand shows details
- [ ] Old/new values display
- [ ] IP and user agent shown
- [ ] Pagination works

### User Management
- [ ] Grant dialog opens
- [ ] User ID validation
- [ ] Role selection works
- [ ] Notes field optional
- [ ] Grant creates admin_users entry
- [ ] Revoke button works
- [ ] Cannot revoke own access
- [ ] Confirmation dialog shows

### Data Browser
- [ ] Table list displays
- [ ] Search tables works
- [ ] Select table loads data
- [ ] Records display correctly
- [ ] JSON expansion works
- [ ] Refresh works
- [ ] Limited to 100 records

## 🔍 Security Audit Checklist

### Database Security
- [ ] RLS enabled on all admin tables
- [ ] Policies tested with regular user
- [ ] Super admin can manage admin_users
- [ ] Only admins can modify app_config
- [ ] Audit log is write-only for system
- [ ] Config history is automatic

### API Security
- [ ] All admin routes check authentication
- [ ] Role-based access enforced
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak info
- [ ] Rate limiting in place (if applicable)

### Frontend Security
- [ ] Admin routes protected by middleware
- [ ] Client-side checks match server-side
- [ ] No admin data in client bundles
- [ ] No hardcoded secrets
- [ ] CSRF protection enabled

### Audit Trail
- [ ] All admin actions logged
- [ ] IP addresses captured
- [ ] User agents captured
- [ ] Before/after values stored
- [ ] Success/failure tracked
- [ ] Cannot delete audit logs

## 📊 Performance Testing

### Config Cache
- [ ] First read populates cache
- [ ] Subsequent reads use cache
- [ ] Cache expires after 5 minutes
- [ ] Update invalidates cache
- [ ] Cache stats accurate

### Dashboard Load Time
- [ ] Dashboard loads in < 1 second
- [ ] Statistics calculated efficiently
- [ ] No N+1 queries
- [ ] Proper indexing used

### Data Browser
- [ ] Table list loads quickly
- [ ] Record fetch limited to 100
- [ ] Large JSON doesn't freeze UI
- [ ] Refresh is responsive

## 🐛 Error Handling Testing

### Invalid Input
- [ ] Invalid JSON shows error
- [ ] Invalid user ID shows error
- [ ] Invalid table name rejected
- [ ] Invalid role rejected

### Network Errors
- [ ] API timeout shows message
- [ ] Database error shows message
- [ ] Graceful degradation
- [ ] Retry mechanisms work

### Edge Cases
- [ ] Empty tables handled
- [ ] Null values displayed
- [ ] Very long strings truncated
- [ ] Concurrent updates handled

## ✅ Pre-Production Checklist

Before deploying admin system to production:

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint passes
- [ ] No console.errors in production
- [ ] Proper error boundaries

### Security
- [ ] All security tests pass
- [ ] RLS policies verified
- [ ] API routes secured
- [ ] Audit logging works
- [ ] No data leakage

### Performance
- [ ] Cache working correctly
- [ ] No performance regression
- [ ] Database queries optimized
- [ ] Proper indexing in place

### Documentation
- [ ] ADMIN_README.md complete
- [ ] Test documentation complete
- [ ] API documentation complete
- [ ] Troubleshooting guide complete

### Testing
- [ ] All automated tests pass
- [ ] Manual testing complete
- [ ] Security audit complete
- [ ] Performance testing done

### Deployment
- [ ] Environment variables set
- [ ] Database migration applied
- [ ] Super admin created
- [ ] Monitoring in place
- [ ] Rollback plan ready

## 🚨 Known Issues & Limitations

### Test Limitations
1. **User Session Testing**
   - Tests use anon client
   - Real user sessions need test users
   - Consider Supabase test helpers

2. **API Route Testing**
   - Requires running server
   - May need auth mocking
   - Consider Playwright for E2E

3. **Cache Testing**
   - In-memory cache is process-specific
   - May need isolated processes
   - Consider Redis for distributed

### Security Considerations
1. **Self-Revocation**
   - Admins cannot revoke own access
   - Need another super admin
   - Document in user guide

2. **Audit Log Retention**
   - Logs grow indefinitely
   - Consider archival strategy
   - Monitor table size

3. **Config Cache**
   - 5-minute TTL may be too long
   - Consider manual invalidation
   - Monitor cache hit rate

## 📚 Additional Resources

- [Admin System README](./ADMIN_README.md)
- [Test Suite README](./__tests__/admin/README.md)
- [Security Tests](./__tests__/admin/security.test.ts)
- [Integration Tests](./__tests__/admin/integration.test.ts)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Testing Guide Version:** 1.0.0  
**Last Updated:** April 16, 2026  
**Status:** Complete ✅
