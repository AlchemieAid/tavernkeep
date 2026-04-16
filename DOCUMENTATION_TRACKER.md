# TavernKeep Documentation Tracker

**Last Updated:** 2026-04-15 (Reanalyzed)  
**Purpose:** Track documentation progress across the entire codebase

## Legend
- ✅ **Fully Documented** - Comprehensive JSDoc with examples
- ❌ **Not Documented** - No documentation
- 🔵 **External/Generated** - Third-party or auto-generated (skip)

---

## Core Systems (16 files)

### Generation System (3 files)
| File | Status | Notes |
|------|--------|-------|
| `lib/generation/orchestrator.ts` | ✅ | Complete with architecture docs |
| `lib/generation/context-builder.ts` | ✅ | Builder pattern documented |
| `lib/generation/types.ts` | ✅ | Type definitions documented |

### Caching & Performance (3 files)
| File | Status | Notes |
|------|--------|-------|
| `lib/cache/ai-cache.ts` | ✅ | Cache-aside pattern documented |
| `lib/openai/retry.ts` | ✅ | Exponential backoff documented |
| `lib/rate-limit.ts` | ✅ | Two-tier rate limiting documented |

### Database & Auth (3 files)
| File | Status | Notes |
|------|--------|-------|
| `lib/supabase/server.ts` | ✅ | Server client creation |
| `lib/supabase/client.ts` | ✅ | Browser client creation |
| `middleware.ts` | ✅ | Auth middleware (root level) |

### Utilities (3 files)
| File | Status | Notes |
|------|--------|-------|
| `lib/utils/truncate-fields.ts` | ✅ | Field truncation for DB |
| `lib/constants/index.ts` | ✅ | App-wide constants |
| `lib/constants/field-limits.ts` | ❌ | Field limit constants |

### Prompts (4 files)
| File | Status | Notes |
|------|--------|-------|
| `lib/prompts/campaign-generation.ts` | ✅ | Campaign AI prompts |
| `lib/prompts/town-generation.ts` | ✅ | Town AI prompts with ruler requirement |
| `lib/prompts/shop-generation.ts` | ✅ | Shop AI prompts with item schemas |
| `lib/prompts/notable-person-generation.ts` | ✅ | NPC AI prompts with depth |

---

## Components (27 files)

### DM Components (14 files)
| File | Status | Notes |
|------|--------|-------|
| `visibility-toggle.tsx` | ✅ | Optimistic UI documented |
| `ai-town-generator.tsx` | ✅ | Generation flow documented |
| `ai-shop-generator.tsx` | ✅ | Shop generation documented |
| `ai-item-generator.tsx` | ✅ | Item generation documented |
| `campaign-invite-modal.tsx` | ✅ | QR code sharing documented |
| `pending-transactions.tsx` | ✅ | Real-time monitoring documented |
| `ai-campaign-generator.tsx` | ✅ | Full hierarchy generation |
| `ai-notable-person-generator.tsx` | ✅ | NPC generation UI |
| `ai-world-generator.tsx` | ✅ | World generation UI |
| `campaign-edit-form.tsx` | ✅ | Campaign editing form |
| `town-edit-form.tsx` | ✅ | Town editing form |
| `notable-person-edit-form.tsx` | ✅ | NPC editing form |
| `item-library-form.tsx` | ✅ | Item library management |
| `shop-item-picker.tsx` | ✅ | Item selection UI |

### Player Components (2 files)
| File | Status | Notes |
|------|--------|-------|
| `add-to-cart-button.tsx` | ✅ | Add to cart with locked detection |
| `shopping-cart.tsx` | ✅ | Real-time cart with subscriptions |

### Shared Components (11 files)
| File | Status | Notes |
|------|--------|-------|
| `ai-usage-counter.tsx` | ✅ | Token usage tracking |
| `breadcrumb.tsx` | ✅ | Dynamic breadcrumb navigation |
| `creation-card-pair.tsx` | ✅ | AI vs manual layout |
| `delete-menu.tsx` | ✅ | Edit/delete actions |
| `item-stats-display.tsx` | ✅ | Category-specific stats |
| `mobile-navigation.tsx` | ✅ | Mobile drawer navigation |
| `nav-header.tsx` | ✅ | Main app header |
| `navigation-dropdowns.tsx` | ✅ | Desktop navigation |
| `profile-menu.tsx` | ✅ | User profile menu |
| `version-badge.tsx` | ✅ | Version display |
| `item-card.tsx` | ❌ | Item display card |

### UI Components
| Status | Notes |
|--------|-------|
| 🔵 | shadcn/ui components (skip) |

---

## API Routes (20 files)

### DM Generation Routes (8 files)
| File | Status | Notes |
|------|--------|-------|
| `generate-campaign/route.ts` | ✅ | Campaign generation endpoint |
| `generate-town/route.ts` | ✅ | Town generation endpoint |
| `generate-shop/route.ts` | ✅ | Shop generation endpoint |
| `generate-items/route.ts` | ✅ | Item generation endpoint |
| `generate-notable-person/route.ts` | ✅ | NPC generation endpoint |
| `generate-world/route.ts` | ✅ | World generation endpoint |
| `generate-hierarchy/route.ts` | ✅ | Full hierarchy generation (SSE) |
| `items/route.ts` | ✅ | Item library list/create |

### DM CRUD Routes (6 files)
| File | Status | Notes |
|------|--------|-------|
| `campaigns/[campaignId]/route.ts` | ✅ | Campaign PATCH/DELETE |
| `towns/[townId]/route.ts` | ✅ | Town GET/PATCH/DELETE |
| `shops/[shopId]/route.ts` | ✅ | Shop GET/PATCH/DELETE |
| `shops/[shopId]/items/route.ts` | ✅ | Add items to shop |
| `items/[itemId]/route.ts` | ✅ | Item library PATCH/DELETE |
| `notable-people/[personId]/route.ts` | ✅ | NPC PATCH/DELETE |

### Player Routes (2 files)
| File | Status | Notes |
|------|--------|-------|
| `cart/add/route.ts` | ✅ | Add to cart |
| `cart/remove/route.ts` | ✅ | Remove from cart |

### Auth & Public Routes (4 files)
| File | Status | Notes |
|------|--------|-------|
| `auth/google/route.ts` | ❌ | Google OAuth |
| `auth/signout/route.ts` | ❌ | Sign out |
| `callback/route.ts` | ❌ | Auth callback |
| `shops/[slug]/route.ts` | ❌ | Public shop access |

---

## Pages (33+ files)

### Main Pages (3 files)
| File | Status | Notes |
|------|--------|-------|
| `page.tsx` | ✅ | Landing page |
| `login/page.tsx` | ✅ | Login page |
| `dm/dashboard/page.tsx` | ✅ | DM dashboard |

### DM Pages (20+ files)
| File | Status | Notes |
|------|--------|-------|
| All other DM pages | ❌ | Campaign, town, shop, item, NPC pages |

### Player Pages (7+ files)
| File | Status | Notes |
|------|--------|-------|
| All player pages | ❌ | Campaigns, characters, shops |

### Auth Pages (3 files)
| File | Status | Notes |
|------|--------|-------|
| `join/[token]/page.tsx` | ❌ | Campaign invite |
| `auth-code-error/page.tsx` | ❌ | Auth error |
| `shop/[slug]/page.tsx` | ❌ | Public shop view |

---

## Supporting Files

### Hooks (0 files found)
No custom hooks directory found - may be inline or not yet created

### Types (2 files)
| File | Status | Notes |
|------|--------|-------|
| `types/database.ts` | ❌ | Supabase database types |
| `lib/supabase/database.types.ts` | ❌ | Generated types |

### Validators (10+ files)
| File | Status | Notes |
|------|--------|-------|
| All validators | ❌ | Zod schemas for validation |

---

## Progress Summary

### Overall Statistics
- **Total Documented Files:** 71
- **Total Project Files:** ~150+
- **Documentation Coverage:** **47%** 🎯

### By Category
| Category | Total | Documented | Percentage |
|----------|-------|------------|------------|
| **Core Systems** | 16 | 15 | **94%** ✨ |
| **Components** | 27 | 26 | **96%** ✨ |
| **API Routes** | 20 | 16 | **80%** ✨ |
| **Pages** | 33+ | 3 | **9%** |
| **Validators** | 10+ | 0 | **0%** |
| **Types** | 2 | 0 | **0%** |

---

## Completed Phases

### ✅ Phase 1: Core Systems (94% Complete)
- ✅ Generation orchestrator & context builder
- ✅ AI cache & retry logic
- ✅ Rate limiting (two-tier)
- ✅ Supabase clients (server, browser, middleware)
- ✅ All prompt templates
- ✅ Utilities (truncation, constants)
- ✅ Generation types
- ❌ Field limits constants (1 remaining)

### ✅ Phase 2: Components (96% Complete)
- ✅ All 14 DM components
- ✅ All 2 player components
- ✅ 10/11 shared components
- ❌ Item card (1 remaining)

### ✅ Phase 3: API Routes (80% Complete)
- ✅ All 8 DM generation routes
- ✅ All 6 DM CRUD routes
- ✅ All 2 player routes
- ❌ 4 auth/public routes remaining

### ⏳ Phase 4: Pages (9% Complete)
- ✅ 3 main pages
- ❌ 30+ remaining pages

### ⏳ Phase 5: Supporting Files (0% Complete)
- ❌ Validators
- ❌ Types
- ❌ Hooks (if any)

---

## Next Priority Files

**Immediate Focus:** Complete remaining high-value files

1. `lib/constants/field-limits.ts` - Complete Core Systems to 100%
2. Auth/public API routes (4 files) - Complete API Routes to 100%
3. DM pages (20+ files) - High usage pages
4. Player pages (7+ files) - User-facing pages
5. Validators (10+ files) - Input validation
6. Types (2 files) - Type definitions
