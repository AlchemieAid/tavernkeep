# TavernKeep Development Backlog

> **Tactical Task Tracking** - Updated weekly with current sprint tasks
> 
> For strategic/system-wide tracking, see **[AUDIT.md](AUDIT.md)**

---

## 📋 Two-Tier Tracking System

### This File (BACKLOG.md) - Tactical
- ✅ Current sprint tasks
- ✅ Priority levels
- ✅ Time estimates
- ✅ Status tracking
- 🔄 **Updated:** Weekly

### AUDIT.md - Strategic
- ✅ System-wide feature status
- ✅ Technical debt
- ✅ Long-term roadmap
- ✅ Architecture decisions
- 🔄 **Updated:** Monthly

## 🔴 Critical (Security/Bugs)
*Nothing currently - all critical security issues resolved!*

---

## 🟡 High Priority (User-Facing Features)

### 1. Campaign Generation Network Error Fix - Testing
**Status:** Fixed, needs user verification  
**Completed:** April 17, 2026  
**What:** Added OpenAI API key validation and better error messages  
**Next:** Monitor for user reports, verify fix is working  
**Files:** `app/api/dm/generate-world/route.ts`, `lib/generation/orchestrator.ts`

### 2. Invite Token Lookup Implementation
**Status:** Blocked by RLS policy removal  
**What:** Need to implement server-side API for campaign invite token lookup  
**Why:** Removed the RLS policy that allowed this, need proper implementation  
**Estimate:** 2-3 hours  
**Files:** Need to create `/api/campaigns/join/[token]/route.ts`

---

## 🟢 Medium Priority (Developer Experience)

### 3. Generate Supabase Types & Enable RLS Audit Tests
**Status:** Documented, not urgent  
**Added:** April 17, 2026  
**What:** Generate TypeScript types for RPC functions, enable automated RLS policy tests  
**Why:** Better type safety, automated security testing  
**Estimate:** 20 minutes  
**Guide:** See `FIX_RLS_AUDIT_TEST.md`  
**Benefit:** Automated security tests in CI/CD

### 4. Set Up Test Users for Integration Tests
**Status:** Template exists, needs setup  
**What:** Create test DM accounts for `data-isolation.test.ts`  
**Why:** Comprehensive security testing beyond policy audits  
**Estimate:** 1-2 hours  
**Files:** `__tests__/security/data-isolation.test.ts`, `scripts/setup-test-users.ts`

---

## 🔵 Low Priority (Nice to Have)

### 5. Automatic Type Generation After Migrations
**What:** Auto-generate Supabase types after running migrations  
**Estimate:** 30 minutes  
**Implementation:**
```json
{
  "scripts": {
    "db:types": "npx supabase gen types typescript --project-id wncswiothhvxntpaweik > lib/supabase/database.types.ts",
    "postmigrate": "npm run db:types"
  }
}
```

### 6. Improve CI/CD Pipeline
**What:** Add security tests to CI, better error reporting  
**Estimate:** 1 hour  
**See:** `CI_CD_IMPROVEMENTS.md` for full plan

### 7. Monthly Security Audits
**What:** Schedule regular RLS policy reviews  
**Frequency:** Monthly  
**Tools:** Use `get_dangerous_policies()` and `verify_dm_table_security()`

---

## ✅ Completed Today (April 17, 2026)

### Security Fixes
- ✅ Fixed shop data leakage (RLS policy)
- ✅ Fixed campaign data leakage (RLS policy)
- ✅ Created RLS policy audit functions
- ✅ Verified all DM-owned tables are secure
- ✅ Created comprehensive security documentation

### Developer Experience
- ✅ Installed and configured Husky pre-commit hooks
- ✅ Set up lint-staged for automatic validation
- ✅ Added validation scripts to package.json
- ✅ Created CI/CD improvement documentation
- ✅ Fixed GitHub Actions type-check failures

### Documentation
- ✅ `SECURITY_AUDIT_2026-04-17.md` - Complete security audit
- ✅ `SECURITY_VERIFICATION_REPORT.md` - Verification of fixes
- ✅ `CI_CD_IMPROVEMENTS.md` - CI/CD best practices
- ✅ `HUSKY_SETUP_COMPLETE.md` - Pre-commit hooks guide
- ✅ `FIX_RLS_AUDIT_TEST.md` - How to enable RLS tests
- ✅ `CAMPAIGN_GENERATION_FIX.md` - Network error fix details

---

## 📊 Feature Requests (User-Driven)

*Add user feature requests here as they come in*

---

## 🎯 Suggested Next Sprint

Based on current state and priorities:

### Option A: User-Facing Features (Recommended)
1. **Implement invite token lookup API** (2-3 hours)
   - Critical for campaign joining functionality
   - Was broken by security fix
   - High user impact

2. **Test campaign generation fix** (30 min)
   - Verify users can create campaigns
   - Monitor error logs
   - Confirm OpenAI API key validation works

### Option B: Developer Infrastructure
1. **Generate Supabase types** (20 min)
   - Better type safety
   - Enable RLS audit tests
   - Quick win

2. **Set up test users** (1-2 hours)
   - Comprehensive security testing
   - Prevent future data leakage
   - Peace of mind

### Option C: New Features
*What features do you want to build next?*
- Shop inventory management improvements?
- Campaign sharing features?
- Player-facing shop browsing?
- AI generation enhancements?

---

## 🔄 Recurring Tasks

### Weekly
- [ ] Review CI failure rate
- [ ] Check for security vulnerabilities (`npm audit`)
- [ ] Monitor error logs

### Monthly
- [ ] Run security audit: `SELECT * FROM get_dangerous_policies()`
- [ ] Review and update documentation
- [ ] Check for dependency updates

### Quarterly
- [ ] Comprehensive security review
- [ ] Performance optimization review
- [ ] User feedback review

---

## 📝 Notes

- **Security is now solid** - All critical issues resolved
- **CI/CD is improved** - Husky prevents type errors
- **Documentation is comprehensive** - Everything is well-documented
- **Ready for feature development** - Infrastructure is stable

---

**Last Updated:** April 17, 2026  
**Next Review:** April 24, 2026
