# TavernKeep Documentation

## 📚 Documentation Structure

All documentation has been organized into the following categories:

---

## 🚀 **Quick Start** (Root Directory)

### Essential Files (Keep in Root)
- **`README.md`** - Project overview and quick start
- **`.designdoc.md`** - Complete design specification (36KB)
- **`.windsurfrules`** - AI development guidelines and project rules
- **`DESIGN.md`** - Google Stitch design tokens (colors, fonts, spacing)
- **`BACKLOG.md`** - Current development priorities and task tracking
- **`AUDIT.md`** - Comprehensive system audit and status
- **`ADMIN_README.md`** - Admin panel documentation

---

## 📁 **Documentation Folders**

### `/docs/security/` - Security Documentation
- `SECURITY_AUDIT_2026-04-17.md` - Critical security vulnerabilities and fixes
- `SECURITY_FIX_SUMMARY.md` - Summary of shop RLS policy fix
- `SECURITY_VERIFICATION_REPORT.md` - Verification of all security fixes

**When to use:** Security reviews, RLS policy audits, vulnerability tracking

---

### `/docs/setup/` - Setup & Deployment
- `SETUP_INSTRUCTIONS.md` - Initial project setup
- `CLI_SETUP.md` - Supabase CLI configuration
- `VERCEL_SETUP.md` - Vercel deployment guide
- `DEPLOYMENT_ALTERNATIVES.md` - Other deployment options
- `VERCEL_BUILD_OPTIMIZATION.md` - Build performance improvements
- `PHASE1_SETUP.md` - Phase 1 setup checklist
- `GIT_IDENTITY_FIX.md` - Git configuration fixes
- `MIGRATION_GUIDE.md` - Database migration guide

**When to use:** New developer onboarding, deployment, environment setup

---

### `/docs/development/` - Development Workflow
- `CI_CD_IMPROVEMENTS.md` - CI/CD best practices and Husky setup
- `HUSKY_SETUP_COMPLETE.md` - Pre-commit hooks guide
- `FIX_RLS_AUDIT_TEST.md` - How to enable RLS audit tests
- `TESTING_GUIDE.md` - Testing strategy and examples
- `TESTING_STRATEGY.md` - Comprehensive testing approach
- `ADMIN_TESTING_GUIDE.md` - Admin panel testing

**When to use:** Setting up dev environment, writing tests, CI/CD configuration

---

### `/docs/architecture/` - Architecture & Design
- `GENERATION_ARCHITECTURE.md` - AI generation system design
- `RATE_LIMIT_IMPLEMENTATION.md` - Rate limiting implementation
- `RATE_LIMIT_SOLUTIONS.md` - Rate limiting strategies
- `ADMIN_SYSTEM_PROPOSAL.md` - Admin system architecture
- `MOBILE_OPTIMIZATION.md` - Mobile responsiveness guide

**When to use:** Understanding system design, making architectural decisions

---

### `/docs/archive/` - Historical Documentation
- `PHASE1_COMPLETE.md` - Phase 1 completion summary
- `PHASE2_COMPLETE.md` - Phase 2 completion summary
- `REFACTOR_SUMMARY.md` - Major refactoring summary
- `CAMPAIGN_GENERATION_FIX.md` - Campaign generation bug fix
- `DOCUMENTATION_TRACKER.md` - Old documentation tracking

**When to use:** Historical reference, understanding past decisions

---

## 🎯 **Where to Find What**

### "I need to..."

#### Set up the project
→ `/docs/setup/SETUP_INSTRUCTIONS.md`

#### Deploy to production
→ `/docs/setup/VERCEL_SETUP.md`

#### Understand security
→ `/docs/security/SECURITY_VERIFICATION_REPORT.md`

#### Write tests
→ `/docs/development/TESTING_GUIDE.md`

#### Fix CI/CD issues
→ `/docs/development/CI_CD_IMPROVEMENTS.md`

#### Understand AI generation
→ `/docs/architecture/GENERATION_ARCHITECTURE.md`

#### See what's next
→ `BACKLOG.md` (root)

#### Understand design system
→ `DESIGN.md` (root)

#### See complete design spec
→ `.designdoc.md` (root)

#### Check system status
→ `AUDIT.md` (root)

---

## 📋 **Documentation Maintenance**

### When Creating New Docs:

1. **Determine category:**
   - Security → `/docs/security/`
   - Setup/Deployment → `/docs/setup/`
   - Development → `/docs/development/`
   - Architecture → `/docs/architecture/`
   - Historical → `/docs/archive/`

2. **Use clear naming:**
   - `WHAT_IT_DOES.md` (e.g., `HUSKY_SETUP_COMPLETE.md`)
   - Include dates for time-sensitive docs (e.g., `SECURITY_AUDIT_2026-04-17.md`)

3. **Update this README:**
   - Add to appropriate section
   - Update "Where to Find What" if needed

### When Archiving Docs:

Move completed/historical docs to `/docs/archive/` with a note in the file header:
```markdown
# [Original Title]
**Status:** ARCHIVED - Completed on [date]
**Superseded by:** [new doc if applicable]
```

---

## 🔄 **Living Documents** (Frequently Updated)

These files are actively maintained and should stay in root:

- **`BACKLOG.md`** - Updated weekly with new tasks
- **`AUDIT.md`** - Updated after major changes
- **`.designdoc.md`** - Updated as design evolves
- **`ADMIN_README.md`** - Updated as admin features change

---

## 🎨 **Design System**

### `DESIGN.md` (Root)
Auto-generated from Google Stitch. Contains:
- Color palette
- Typography scale
- Spacing system
- Border radii
- Shadows

**⚠️ DO NOT HAND-EDIT** - Regenerate from Stitch when design changes

### `.designdoc.md` (Root)
Complete design specification including:
- User flows
- Component specs
- Database schema
- API design
- Business logic

---

## 🤖 **AI Development Guidelines**

### `.windsurfrules` (Root)
Critical file that defines:
- Project structure
- Coding standards
- TypeScript rules
- Component patterns
- Database conventions
- Testing requirements
- Security policies

**This file governs all AI-assisted development** - keep it updated!

---

## 📊 **Progress Tracking**

### Primary: `BACKLOG.md` (Root)
- Current sprint tasks
- Priority levels
- Estimates
- Status tracking

### Secondary: `AUDIT.md` (Root)
- System-wide status
- Feature completion
- Known issues
- Technical debt

### Historical: `/docs/archive/PHASE*_COMPLETE.md`
- Milestone summaries
- What was accomplished
- Lessons learned

---

## 🔍 **Quick Reference**

```
Root Directory (Essential Files Only)
├── README.md                 # Project overview
├── .designdoc.md            # Complete design spec
├── .windsurfrules           # AI development rules
├── DESIGN.md                # Design tokens (auto-generated)
├── BACKLOG.md               # Current tasks
├── AUDIT.md                 # System status
└── ADMIN_README.md          # Admin documentation

docs/
├── security/                # Security docs
├── setup/                   # Setup & deployment
├── development/             # Dev workflow
├── architecture/            # System design
└── archive/                 # Historical docs
```

---

**Last Updated:** April 17, 2026  
**Maintained by:** Development Team  
**Review Frequency:** Monthly
