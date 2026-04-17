# Admin System Tests

Comprehensive test suite to ensure admin capabilities are secure and don't leak to regular users.

## 🎯 Test Coverage

### Security Tests (`security.test.ts`)

**Critical security tests that MUST pass before production deployment.**

#### RLS Policy Tests
- ✅ Regular users cannot read `admin_users` table
- ✅ Regular users cannot insert into `admin_users`
- ✅ Regular users cannot update `admin_users`
- ✅ Regular users cannot delete from `admin_users`
- ✅ Regular users CAN read `app_config` (needed for app)
- ✅ Regular users cannot modify `app_config`
- ✅ Regular users cannot access `admin_audit_log`
- ✅ Regular users cannot access `app_config_history`

#### API Route Security
- ✅ `/api/admin/config` rejects non-admin requests
- ✅ `/api/admin/users/grant` rejects non-super-admin requests
- ✅ `/api/admin/users/revoke` rejects non-super-admin requests
- ✅ `/api/admin/data/[table]` rejects non-admin requests
- ✅ Invalid table names are rejected

#### Helper Function Security
- ✅ `is_admin()` returns false for non-admins
- ✅ `is_admin()` doesn't leak other users' admin status
- ✅ `get_config()` works for regular users (public configs)
- ✅ `get_config()` returns fallback for non-existent keys

#### Route Protection
- ✅ `/admin` routes redirect non-admins to `/unauthorized`
- ✅ `/unauthorized` is accessible to all users

#### Data Isolation
- ✅ Config cache doesn't expose admin-only data
- ✅ Audit logs are completely isolated from regular users

### Integration Tests (`integration.test.ts`)

**End-to-end workflow tests.**

#### Config Management
- Config update workflow
- Config rollback workflow
- Cache invalidation
- Audit logging

#### User Management
- Grant admin workflow
- Revoke admin workflow
- Self-revocation prevention

#### Audit Log
- Action logging
- Filtering and search
- IP/user agent capture

#### Data Browser
- Table browsing
- Empty table handling
- Record limits

#### Performance
- Cache behavior (5-min TTL)
- Regular user performance
- Admin dashboard load time

#### Error Handling
- Invalid JSON handling
- Invalid user ID handling
- Network errors
- Concurrent access

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
npm install --save-dev @jest/globals @supabase/supabase-js

# Set up environment variables
cp .env.example .env.test
```

### Run All Tests

```bash
npm test
```

### Run Security Tests Only

```bash
npm test -- __tests__/admin/security.test.ts
```

### Run Integration Tests Only

```bash
npm test -- __tests__/admin/integration.test.ts
```

### Run with Coverage

```bash
npm test -- --coverage
```

## 📋 Test Checklist

Before deploying admin system to production:

- [ ] All security tests pass
- [ ] All integration tests pass
- [ ] RLS policies verified
- [ ] API routes secured
- [ ] Admin routes protected
- [ ] Audit logging works
- [ ] Cache behavior correct
- [ ] Error handling robust
- [ ] Performance acceptable
- [ ] Documentation complete

## 🔐 Security Test Matrix

| Test Area | Regular User | Config Admin | Data Admin | Super Admin |
|-----------|-------------|--------------|------------|-------------|
| Read admin_users | ❌ | ❌ | ❌ | ✅ |
| Modify admin_users | ❌ | ❌ | ❌ | ✅ |
| Read app_config | ✅ | ✅ | ✅ | ✅ |
| Modify app_config | ❌ | ✅ | ❌ | ✅ |
| Read audit_log | ❌ | ✅ | ✅ | ✅ |
| Grant admin | ❌ | ❌ | ❌ | ✅ |
| Revoke admin | ❌ | ❌ | ❌ | ✅ |
| Browse data | ❌ | ❌ | ✅ | ✅ |
| Access /admin | ❌ | ✅ | ✅ | ✅ |

## 🧪 Manual Testing Checklist

### As Regular User (No Admin Role)

- [ ] Cannot access `/admin`
- [ ] Redirected to `/unauthorized`
- [ ] Cannot call admin API routes
- [ ] Cannot read `admin_users` table
- [ ] Cannot modify `app_config` table
- [ ] Cannot read `admin_audit_log` table
- [ ] CAN read `app_config` for public configs
- [ ] CAN use `get_config()` function

### As Config Admin

- [ ] Can access `/admin`
- [ ] Can access `/admin/config`
- [ ] Can modify configuration
- [ ] Can view audit log
- [ ] Cannot access `/admin/users`
- [ ] Cannot grant/revoke admin roles
- [ ] All config changes logged

### As Data Admin

- [ ] Can access `/admin`
- [ ] Can access `/admin/data`
- [ ] Can browse all tables
- [ ] Can view audit log
- [ ] Cannot access `/admin/users`
- [ ] Cannot modify configuration
- [ ] Cannot grant/revoke admin roles

### As Super Admin

- [ ] Can access all `/admin` routes
- [ ] Can modify configuration
- [ ] Can grant admin roles
- [ ] Can revoke admin roles (except own)
- [ ] Can browse all data
- [ ] Can view complete audit log
- [ ] All actions logged to audit trail

## 🐛 Known Test Limitations

1. **User Session Testing**
   - Tests use anon client
   - Real user sessions would require test users
   - Consider using Supabase test helpers

2. **API Route Testing**
   - Requires running Next.js server
   - May need to mock authentication
   - Consider using Playwright for E2E

3. **Cache Testing**
   - In-memory cache is process-specific
   - May need to test in isolated processes
   - Consider using Redis for distributed cache

4. **Concurrent Access**
   - Difficult to test race conditions
   - May need specialized testing tools
   - Consider load testing tools

## 📚 Additional Testing Resources

- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Playwright E2E Testing](https://playwright.dev/)

## ⚠️ Critical Security Reminders

1. **Never bypass RLS in tests** - Tests should verify RLS works
2. **Test with real user sessions** - Anon client has different permissions
3. **Verify audit logging** - Every admin action must be logged
4. **Check IP capture** - Ensure IP addresses are recorded
5. **Test self-revocation** - Admins cannot revoke own access
6. **Validate input** - All user input must be validated
7. **Test error cases** - Errors should not leak sensitive info

## 🎯 Success Criteria

Tests are successful when:

- ✅ All security tests pass
- ✅ Regular users completely isolated from admin functions
- ✅ RLS policies enforce all access control
- ✅ API routes reject unauthorized requests
- ✅ Audit log captures all admin actions
- ✅ Cache behavior is correct
- ✅ Error handling is robust
- ✅ Performance is acceptable
- ✅ No data leakage between users

---

**Test Suite Version:** 1.0.0  
**Last Updated:** April 16, 2026  
**Status:** Ready for Implementation
