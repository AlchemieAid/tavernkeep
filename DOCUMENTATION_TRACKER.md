# TavernKeep Documentation Tracker

**Last Updated:** 2026-04-15  
**Purpose:** Track documentation progress across the entire codebase

## Legend
- ✅ **Fully Documented** - Comprehensive JSDoc with examples
- 🟡 **Partially Documented** - Has some comments but needs improvement
- ❌ **Not Documented** - No documentation
- 🔵 **External/Generated** - Third-party or auto-generated (skip)

---

## Core Systems

### Generation System
| File | Status | Notes |
|------|--------|-------|
| `lib/generation/orchestrator.ts` | ✅ | Complete with architecture docs |
| `lib/generation/context-builder.ts` | ✅ | Builder pattern documented |
| `lib/generation/types.ts` | ❌ | Type definitions need docs |

### Caching & Performance
| File | Status | Notes |
|------|--------|-------|
| `lib/cache/ai-cache.ts` | ✅ | Cache-aside pattern documented |
| `lib/openai/retry.ts` | ✅ | Exponential backoff documented |
| `lib/rate-limit.ts` | ❌ | Rate limiting logic needs docs |

### Database & Auth
| File | Status | Notes |
|------|--------|-------|
| `lib/supabase/server.ts` | ❌ | Server client creation |
| `lib/supabase/client.ts` | ❌ | Browser client creation |
| `lib/supabase/middleware.ts` | ❌ | Auth middleware |

### Utilities
| File | Status | Notes |
|------|--------|-------|
| `lib/utils/truncate-fields.ts` | ❌ | Field truncation for DB |
| `lib/utils/currency.ts` | ❌ | Currency conversion |
| `lib/constants.ts` | ❌ | App-wide constants |

### Prompts
| File | Status | Notes |
|------|--------|-------|
| `lib/prompts/campaign-generation.ts` | ❌ | Campaign AI prompts |
| `lib/prompts/town-generation.ts` | ❌ | Town AI prompts |
| `lib/prompts/shop-generation.ts` | ❌ | Shop AI prompts |
| `lib/prompts/notable-person-generation.ts` | ❌ | NPC AI prompts |

---

## Components

### DM Components (`components/dm/`)
| File | Status | Notes |
|------|--------|-------|
| `visibility-toggle.tsx` | ✅ | Optimistic UI documented |
| `ai-town-generator.tsx` | ✅ | Generation flow documented |
| `ai-shop-generator.tsx` | ✅ | Shop generation documented |
| `ai-item-generator.tsx` | ✅ | Item generation documented |
| `campaign-invite-modal.tsx` | ✅ | QR code sharing documented |
| `pending-transactions.tsx` | ✅ | Real-time monitoring documented |
| `ai-campaign-generator.tsx` | ❌ | Campaign generation UI |
| `ai-notable-person-generator.tsx` | ❌ | NPC generation UI |
| `ai-world-generator.tsx` | ❌ | World generation UI |
| `campaign-edit-form.tsx` | ❌ | Campaign editing form |
| `town-edit-form.tsx` | ❌ | Town editing form |
| `notable-person-edit-form.tsx` | ❌ | NPC editing form |
| `item-library-form.tsx` | ❌ | Item library management |
| `shop-item-picker.tsx` | ❌ | Item selection UI |

### Player Components (`components/player/`)
| File | Status | Notes |
|------|--------|-------|
| `shop-browser.tsx` | ❌ | Shop browsing interface |
| `cart-sidebar.tsx` | ❌ | Shopping cart UI |
| `character-selector.tsx` | ❌ | Character selection |
| `item-card.tsx` | ❌ | Item display card |

### Shared Components (`components/shared/`)
| File | Status | Notes |
|------|--------|-------|
| `currency-display.tsx` | ❌ | Currency formatting |
| `rarity-badge.tsx` | ❌ | Item rarity display |
| `markdown-renderer.tsx` | ❌ | Markdown rendering |

### UI Components (`components/ui/`)
| Status | Notes |
|--------|-------|
| 🔵 | shadcn/ui components (skip) |

---

## API Routes

### DM API Routes (`app/api/dm/`)
| File | Status | Notes |
|------|--------|-------|
| `generate-campaign/route.ts` | ❌ | Campaign generation endpoint |
| `generate-town/route.ts` | ❌ | Town generation endpoint |
| `generate-shop/route.ts` | ❌ | Shop generation endpoint |
| `generate-items/route.ts` | ❌ | Item generation endpoint |
| `generate-notable-person/route.ts` | ❌ | NPC generation endpoint |
| `generate-world/route.ts` | ❌ | World generation endpoint |
| `generate-hierarchy/route.ts` | ❌ | Full hierarchy generation |
| `campaigns/[campaignId]/route.ts` | ❌ | Campaign CRUD |
| `towns/[townId]/route.ts` | ❌ | Town CRUD |
| `shops/[shopId]/route.ts` | ❌ | Shop CRUD |
| `shops/[shopId]/items/route.ts` | ❌ | Shop items management |
| `items/[itemId]/route.ts` | ❌ | Item CRUD |
| `notable-people/[personId]/route.ts` | ❌ | NPC CRUD |

### Player API Routes (`app/api/player/`)
| File | Status | Notes |
|------|--------|-------|
| `cart/add/route.ts` | ❌ | Add to cart |
| `cart/remove/route.ts` | ❌ | Remove from cart |

### Auth Routes (`app/auth/`)
| File | Status | Notes |
|------|--------|-------|
| `google/route.ts` | ❌ | Google OAuth |
| `signout/route.ts` | ❌ | Sign out |
| `callback/route.ts` | ❌ | Auth callback |

### Public Routes (`app/api/`)
| File | Status | Notes |
|------|--------|-------|
| `shops/[slug]/route.ts` | ❌ | Public shop access |

---

## Pages

### DM Pages (`app/dm/`)
| File | Status | Notes |
|------|--------|-------|
| `layout.tsx` | ❌ | DM layout wrapper |
| `dashboard/page.tsx` | ❌ | DM dashboard |
| `campaigns/new/page.tsx` | ❌ | Create campaign |
| `campaigns/[campaignId]/page.tsx` | ❌ | Campaign detail |
| `campaigns/[campaignId]/edit/page.tsx` | ❌ | Edit campaign |
| `campaigns/[campaignId]/towns/new/page.tsx` | ❌ | Create town |
| `towns/[townId]/page.tsx` | ❌ | Town detail |
| `towns/[townId]/edit/page.tsx` | ❌ | Edit town |
| `towns/[townId]/notable-people/new/page.tsx` | ❌ | Create NPC |
| `shops/new/page.tsx` | ❌ | Create shop |
| `shops/[shopId]/page.tsx` | ❌ | Shop detail |
| `shops/[shopId]/edit/page.tsx` | ❌ | Edit shop |
| `shops/[shopId]/qr/page.tsx` | ❌ | Shop QR code |
| `shops/[shopId]/items/new/page.tsx` | ❌ | Create item |
| `shops/[shopId]/items/add/page.tsx` | ❌ | Add existing item |
| `shops/[shopId]/items/[itemId]/page.tsx` | ❌ | Item detail |
| `items/page.tsx` | ❌ | Item library |
| `items/new/page.tsx` | ❌ | Create library item |
| `items/[itemId]/page.tsx` | ❌ | Library item detail |
| `notable-people/[personId]/edit/page.tsx` | ❌ | Edit NPC |

### Player Pages (`app/player/`)
| File | Status | Notes |
|------|--------|-------|
| `layout.tsx` | ❌ | Player layout wrapper |
| `dashboard/page.tsx` | ❌ | Player dashboard |
| `shops/page.tsx` | ❌ | Browse shops |
| `shops/[slug]/page.tsx` | ❌ | Shop detail |
| `cart/page.tsx` | ❌ | Shopping cart |
| `characters/page.tsx` | ❌ | Character management |

### Public Pages (`app/`)
| File | Status | Notes |
|------|--------|-------|
| `page.tsx` | ❌ | Landing page |
| `login/page.tsx` | ❌ | Login page |
| `join/[token]/page.tsx` | ❌ | Campaign invite |

---

## Hooks

### Custom Hooks (`hooks/`)
| File | Status | Notes |
|------|--------|-------|
| `use-cart.ts` | ❌ | Shopping cart hook |
| `use-character.ts` | ❌ | Character selection hook |
| `use-currency.ts` | ❌ | Currency conversion hook |

---

## Types

### Type Definitions (`types/`)
| File | Status | Notes |
|------|--------|-------|
| `database.ts` | ❌ | Supabase database types |
| `index.ts` | ❌ | Exported types |

---

## Configuration

### Config Files
| File | Status | Notes |
|------|--------|-------|
| `next.config.js` | 🔵 | Next.js config (skip) |
| `tailwind.config.ts` | 🔵 | Tailwind config (skip) |
| `tsconfig.json` | 🔵 | TypeScript config (skip) |
| `.windsurfrules` | 🔵 | Project rules (skip) |

---

## Progress Summary

### Overall Statistics
- **Total Files:** ~150+
- **Fully Documented:** 10 (7%)
- **Partially Documented:** 0 (0%)
- **Not Documented:** ~140 (93%)

### By Category
| Category | Total | Documented | Percentage |
|----------|-------|------------|------------|
| Core Systems | 12 | 3 | 25% |
| Components | 30+ | 6 | 20% |
| API Routes | 20+ | 0 | 0% |
| Pages | 40+ | 0 | 0% |
| Hooks | 3 | 0 | 0% |
| Types | 2 | 0 | 0% |

---

## Documentation Priorities

### Phase 1: Core Systems (High Priority)
1. ✅ Generation orchestrator
2. ✅ Context builder
3. ✅ AI cache
4. ✅ Retry logic
5. ⏳ Rate limiting
6. ⏳ Supabase clients
7. ⏳ Prompt templates
8. ⏳ Utilities

### Phase 2: Components (Medium Priority)
1. ✅ DM generators (6/14 done)
2. ⏳ DM forms (0/4 done)
3. ⏳ Player components (0/4 done)
4. ⏳ Shared components (0/3 done)

### Phase 3: API Routes (Medium Priority)
1. ⏳ DM generation endpoints (0/7 done)
2. ⏳ DM CRUD endpoints (0/6 done)
3. ⏳ Player endpoints (0/2 done)
4. ⏳ Auth endpoints (0/3 done)

### Phase 4: Pages (Lower Priority)
1. ⏳ DM pages (0/20 done)
2. ⏳ Player pages (0/5 done)
3. ⏳ Public pages (0/3 done)

### Phase 5: Supporting Files (Lower Priority)
1. ⏳ Hooks (0/3 done)
2. ⏳ Types (0/2 done)

---

## Next Steps

**Current Focus:** Phase 1 - Core Systems

**Next Files to Document:**
1. `lib/rate-limit.ts` - Rate limiting implementation
2. `lib/supabase/server.ts` - Server-side Supabase client
3. `lib/supabase/client.ts` - Client-side Supabase client
4. `lib/supabase/middleware.ts` - Auth middleware
5. `lib/prompts/campaign-generation.ts` - Campaign prompts
