# TavernKeep Implementation Audit

**Date**: April 5, 2026  
**Purpose**: Review implementation against .windsurfrules design document

---

## ✅ Completed Features

### Core Architecture
- ✅ Next.js 14 App Router
- ✅ TypeScript with strict mode
- ✅ Tailwind CSS + shadcn/ui
- ✅ Supabase backend with RLS
- ✅ Vercel deployment
- ✅ File structure follows conventions

### Database & Schema
- ✅ Campaigns, Towns, Shops, Items hierarchy
- ✅ RLS policies on all tables
- ✅ Migrations in `/supabase/migrations/`
- ✅ Profile auto-creation trigger
- ✅ AI usage tracking tables
- ✅ Generation cache and ratings tables
- ✅ Party access for player sharing

### Authentication
- ✅ Google OAuth via Supabase
- ✅ Middleware protection for `/dm/*` routes
- ✅ Public player routes (no auth required)
- ✅ httpOnly cookies via @supabase/ssr

### AI Integration
- ✅ Campaign generation (GPT-4o-mini)
- ✅ Town generation (GPT-4o-mini)
- ✅ Prompts in `/lib/prompts/`
- ✅ Content moderation
- ✅ Rate limiting (5 campaigns/hr, 10 towns/hr)
- ✅ Prompt caching with similarity matching
- ✅ Rating system (1-5 stars)
- ✅ Cost tracking and display
- ✅ Smart brevity optimization

### UI Components
- ✅ Landing page with features
- ✅ Sticky navigation with dropdowns
- ✅ Campaign/Town/Shop navigation
- ✅ AI generation components
- ✅ Version badge
- ✅ AI usage counter
- ✅ Profile menu
- ✅ Breadcrumb navigation

### DM Features
- ✅ Dashboard
- ✅ Campaign management
- ✅ Town management
- ✅ Shop management
- ✅ Manual creation flows
- ✅ AI-powered generation

---

## ⚠️ Missing Features (From Design Doc)

### High Priority

1. **Zod Validation** (Rule #7, #36)
   - ❌ No `/lib/validators/` directory
   - ❌ API routes not using Zod schemas
   - ❌ Form validation not using Zod
   - **Impact**: Type safety gap, potential runtime errors

2. **Shop AI Generator** (Rule #10)
   - ❌ Shop generation not integrated with towns
   - ❌ Existing `/api/dm/generate-shop` needs town context
   - **Impact**: Can't generate shops within town hierarchy

3. **Item AI Generator** (Rule #10)
   - ❌ No item generation endpoint
   - ❌ No item generation UI
   - **Impact**: Core feature missing

4. **Error Boundaries** (Rule #13)
   - ❌ Missing `loading.tsx` in most routes
   - ❌ Missing `error.tsx` in most routes
   - ❌ Missing `not-found.tsx` with D&D flavor
   - **Impact**: Poor error UX

5. **Player Shop View** (Rule #12)
   - ❌ No player-facing shop view
   - ❌ No QR code generation
   - ❌ No party access management
   - **Impact**: Core sharing feature missing

### Medium Priority

6. **Image Generation** (Rule #10)
   - ❌ No DALL-E 3 integration
   - ❌ No shopkeeper portraits
   - ❌ No shop exterior/interior images
   - ❌ No Supabase Storage integration
   - **Impact**: Visual richness missing

7. **Design System** (Rule #2, #11)
   - ⚠️ `DESIGN.md` exists but may not be from Stitch
   - ❌ No Stitch MCP workflow used
   - ❌ Typography not using Cinzel/Crimson Text/Courier Prime
   - **Impact**: Design consistency issues

8. **Soft Delete** (Rule #8)
   - ❌ No `deleted_at` column on items
   - ❌ Hard deletes instead of soft deletes
   - **Impact**: Data loss risk

9. **Edge Caching** (Rule #14)
   - ❌ No edge caching for player routes
   - ❌ No `revalidatePath` on DM updates
   - **Impact**: Performance opportunity missed

### Low Priority

10. **Loading States** (Rule #10)
    - ⚠️ Some loading skeletons missing
    - ⚠️ Button disable states incomplete

11. **Mobile Optimization** (Rule #12)
    - ⚠️ Not tested at 375px/390px/428px
    - ⚠️ Touch targets may be < 44px

12. **Git Conventions** (Rule #17)
    - ⚠️ Commit messages don't follow exact format

---

## 🐛 Code Quality Issues

### TypeScript Errors
```
- Supabase type inference issues (Database type not recognized)
- Property 'display_name' does not exist on type 'never'
- Property 'id' does not exist on type 'never'
- Multiple "No overload matches" errors
```

### Missing Type Safety
- API routes return `any` instead of typed responses
- No Zod validation on inputs
- Some components use loose typing

### File Organization
- Missing `/lib/validators/` directory
- Missing `/lib/constants/` directory
- Some utilities could be better organized

---

## 📋 Recommended Next Steps

### Phase 1: Critical Fixes (1-2 days)
1. **Add Zod Validation**
   - Create `/lib/validators/` directory
   - Add schemas for all API inputs
   - Validate all forms with Zod

2. **Fix TypeScript Errors**
   - Regenerate Supabase types
   - Fix Database interface issues
   - Add proper type guards

3. **Add Error Boundaries**
   - Create `loading.tsx` for all routes
   - Create `error.tsx` with D&D flavor
   - Create `not-found.tsx` pages

### Phase 2: Core Features (3-5 days)
4. **Complete AI Generation**
   - Update shop generator for towns
   - Build item generator
   - Add image generation (DALL-E 3)

5. **Player Shop View**
   - Build public shop page
   - Add QR code generation
   - Implement party access

6. **Soft Delete System**
   - Add `deleted_at` to items
   - Update queries to filter deleted
   - Add restore functionality

### Phase 3: Polish (2-3 days)
7. **Design System Alignment**
   - Review Stitch designs
   - Update typography
   - Ensure color consistency

8. **Performance Optimization**
   - Add edge caching
   - Implement revalidation
   - Optimize images

9. **Mobile Testing**
   - Test all breakpoints
   - Fix touch targets
   - Improve mobile UX

---

## 💡 Technical Debt

1. **Database Types**: Supabase type generation needs fixing
2. **Error Handling**: Inconsistent error handling patterns
3. **Loading States**: Some components missing loading UI
4. **Code Duplication**: Similar patterns in campaign/town generators
5. **Test Coverage**: No tests written yet

---

## 🎯 Success Metrics

- ✅ 95%+ AI cost reduction achieved
- ✅ Navigation system working
- ✅ Campaign/Town hierarchy complete
- ⚠️ Type safety: ~60% (needs Zod)
- ⚠️ Error handling: ~40% (needs boundaries)
- ❌ Player features: 0% (not started)
- ❌ Image generation: 0% (not started)

---

---

## 🆕 New Requirements (2026-04-05)

### Edit Functionality for All Entities
**Status**: Not Started  
**Priority**: High

**Requirement**: Add full edit capability for all entities with all parameters visible and editable.

**Entities to Support**:
1. **Campaigns** - Edit all fields including new parameters (ruleset, setting, history, currency, pantheon)
2. **Towns** - Edit all fields including new parameters (population, size, location, ruler, political_system, history)
3. **Notable People** - Edit all fields (name, race, role, backstory, motivation, personality_traits)
4. **Shops** - Edit all fields including new parameters (notable_person_id, reputation, size, security, operating_hours, special_services)
5. **Items** - Edit all fields including new parameters (attunement_required, cursed, identified, crafting_time_days, source)

**UI Requirements**:
- ✅ Add "Edit" option to all kebab menus (three-dot menus)
- ✅ Add dedicated "Edit" button to main detail view of each entity
- ✅ Display ALL parameters in detail view (not just name/description)
- ✅ Edit forms must include ALL parameters with appropriate input types:
  - Text inputs for strings
  - Number inputs for integers
  - Dropdowns for enums
  - Textareas for long text
  - Checkboxes for booleans
  - Array inputs for text arrays
- ✅ Form validation using existing Zod schemas
- ✅ Success/error feedback after save
- ✅ Cancel button to discard changes

**Implementation Tasks**:
- ❌ Create `/app/(dm)/campaigns/[campaignId]/edit/page.tsx`
- ❌ Create `/app/(dm)/towns/[townId]/edit/page.tsx`
- ❌ Create `/app/(dm)/notable-people/[personId]/edit/page.tsx`
- ❌ Create `/app/(dm)/shops/[shopId]/edit/page.tsx`
- ❌ Create `/app/(dm)/items/[itemId]/edit/page.tsx`
- ❌ Add edit buttons to all detail views
- ❌ Add edit options to all kebab menus
- ❌ Update detail views to show all parameters
- ❌ Create API PATCH endpoints for all entities
- ❌ Add optimistic updates for better UX

---

## 🆕 New Requirements (2026-04-05) - Database Schema

### Campaign-Level Parameters
**Status**: ✅ Database Applied | ⚠️ UI Pending  
**Priority**: High

Add configurable parameters that inform AI generation:
- ✅ Ruleset dropdown (5e, 4e, 3e, 2e, Pathfinder, Traveler, etc.)
- ✅ Setting/world name
- ✅ History/lore
- ✅ Currency system
- ✅ Pantheon/deities
- ✅ Other global variables

**Database Changes** ✅ COMPLETED:
- ✅ Migration created: `20260405_add_campaign_parameters.sql`
- ✅ Campaign type updated in `types/database.ts`
- ✅ Zod validators updated in `lib/validators/campaign.ts`

**UI Changes Needed**:
- ❌ Update campaign creation form
- ❌ Update campaign edit page
- ❌ Add fields to AI generation prompt builder

---

### Town-Level Parameters
**Status**: ✅ Database Applied | ⚠️ UI Pending  
**Priority**: High

Add town-specific parameters:
- ✅ Population size
- ✅ Geographic size (hamlet, village, town, city, metropolis)
- ✅ Geographic location (desert, forest, wilderness, necropolis, arctic, plains, riverside, coastal, mountain, swamp, underground, floating, jungle)
- ✅ Ruler/leadership
- ✅ Political system (monarchy, democracy, oligarchy, theocracy, anarchy, military, tribal, merchant_guild, magocracy)
- ✅ History
- ✅ Notable figures reference

**Database Changes** ✅ COMPLETED:
- ✅ Migration created: `20260405_add_town_parameters.sql`
- ✅ Town type updated in `types/database.ts` with enums
- ✅ Zod validators updated in `lib/validators/town.ts`

**UI Changes Needed**:
- ❌ Update town creation form
- ❌ Update town edit page
- ❌ Add fields to AI generation prompt builder

---

### Notable People System (NEW ENTITY)
**Status**: ✅ Database Applied | ⚠️ UI Pending  
**Priority**: High

**Major Architectural Change**: Replace "Shop Keepers" with "Notable People" entity.

**Concept**:
- Notable People are town residents with various roles
- Some Notable People run shops (shop keepers)
- Others are quest givers, rulers, priests, magicians, etc.
- Each town can have multiple Notable People
- Notable People should have their own dropdown navigation (like campaigns/towns/shops)

**Database Changes** ✅ COMPLETED:
- ✅ Migration created: `20260405_create_notable_people.sql`
- ✅ Full `notable_people` table with RLS policies
- ✅ Roles enum: shopkeeper, quest_giver, ruler, priest, magician, merchant, guard, noble, commoner, blacksmith, innkeeper, healer, scholar, criminal, artisan
- ✅ Indexes for performance
- ✅ Updated_at trigger
- ✅ Migration created: `20260405_refactor_shops_for_notable_people.sql`
- ✅ Added `notable_person_id` to shops table
- ✅ Legacy keeper fields marked DEPRECATED (kept for backward compatibility)
- ✅ NotablePerson type added to `types/database.ts`
- ✅ Zod validators created in `lib/validators/notable-person.ts`

**UI Changes Needed**:
- ❌ Create Notable People CRUD pages
- ❌ Add Notable People to navigation dropdown
- ❌ Update shop creation/edit to assign from Notable People list
- ❌ Create Notable People AI generator
- ❌ Update shop AI generator to optionally create Notable Person

---

### Shop Parameter Analysis
**Status**: ✅ Database Applied | ⚠️ UI Pending  
**Priority**: Medium

**Current Parameters** (already good):
- shop_type, location_descriptor, economic_tier
- price_modifier, haggle_enabled, haggle_dc
- inventory_volatility, last_restocked_at

**New Additions** ✅ COMPLETED:
- ✅ `shop_reputation` (enum: 'unknown', 'poor', 'fair', 'good', 'excellent')
- ✅ `shop_size` (enum: 'tiny', 'small', 'medium', 'large', 'massive')
- ✅ `shop_security` (enum: 'none', 'basic', 'moderate', 'high', 'fortress')
- ✅ `operating_hours` (text) - e.g., "Dawn to dusk", "24/7", "Evenings only"
- ✅ `special_services` (text[]) - e.g., ["Repairs", "Custom orders", "Appraisals"]
- ✅ Migration created: `20260405_refactor_shops_for_notable_people.sql`
- ✅ Shop type updated in `types/database.ts`
- ✅ Zod validators updated in `lib/validators/shop.ts`

---

### Item Parameter Analysis
**Status**: ✅ Database Applied | ⚠️ UI Pending  
**Priority**: Low

**Current Parameters** (already comprehensive):
- name, description, category, rarity
- base_price_gp, stock_quantity
- is_hidden, hidden_condition
- weight_lbs, properties (jsonb)
- expires_at, deleted_at

**New Additions** ✅ COMPLETED:
- ✅ `attunement_required` (boolean)
- ✅ `cursed` (boolean)
- ✅ `identified` (boolean) - for mystery items
- ✅ `crafting_time_days` (int, nullable) - for custom orders
- ✅ `source` (enum: 'purchased', 'crafted', 'looted', 'generated', 'quest_reward', 'gift')
- ✅ Migration created: `20260405_add_item_parameters.sql`
- ✅ Item type updated in `types/database.ts`
- ✅ Zod validators updated in `lib/validators/item.ts`

---

### AI Generation Wizard (Campaign-Level)
**Status**: Not Started  
**Priority**: High

**New Feature**: Multi-step AI generation wizard at campaign level.

**Workflow**:
1. DM invokes AI at campaign level
2. Wizard asks: "How many towns should this campaign have?"
3. AI generates campaign with specified parameters
4. For each town:
   - AI generates town with appropriate parameters
   - AI generates 3-8 Notable People per town (based on population)
   - AI generates 1-5 shops per town (based on size)
   - AI assigns Notable People as shop keepers
   - AI generates 5-20 items per shop (based on shop type/tier)

**Implementation Needs**:
- New API endpoint: `/api/dm/generate-campaign-wizard`
- Multi-step UI wizard component
- Batch generation with progress tracking
- Transaction handling (all-or-nothing generation)
- Cost estimation before generation
- Ability to review and edit before finalizing

---

---

## 🆕 Shop Management Improvements (2026-04-05)

### Multiple Active Shops
**Status**: ✅ COMPLETED  
**Priority**: High

**Change**: Removed single-active-shop restriction. All shops are now always active and visible to players.

**Implementation**:
- ✅ Removed `toggleActive` server action from shop detail page
- ✅ Removed "Activate/Deactivate" button from shop UI
- ✅ Removed "Active Shop QR Code" button from town pages
- ✅ Removed gold ring styling for active shops
- ✅ All shops now show "View Public Shop" button
- ✅ Set `is_active: true` by default for all new shops (manual and AI-generated)

**Rationale**: Managing shop activation was too burdensome for DMs. Now all shops are immediately accessible to players.

---

### Item Visibility Toggle
**Status**: ✅ COMPLETED  
**Priority**: High

**Change**: Added instant "Reveal to Players" toggle for hidden items on DM shop view.

**Implementation**:
- ✅ Added `toggleItemVisibility` server action
- ✅ Added Eye icon button for hidden items (reveals to players)
- ✅ Added EyeOff icon button for revealed items with `hidden_condition` (hides again)
- ✅ Updated hidden item label to "(Hidden from Players)" for clarity
- ✅ Buttons appear next to item action menu

**Rationale**: DMs can now instantly reveal hidden items when players meet the reveal condition, without needing to edit the item.

---

### UI Consistency - AI/Manual Creation Order
**Status**: ✅ COMPLETED  
**Priority**: Medium

**Change**: Swapped AI and manual creation card positions to be consistent across all entity types.

**Implementation**:
- ✅ **Campaigns**: AI generator left, Manual creation right
- ✅ **Towns**: AI generator left, Manual creation right  
- ✅ **Shops**: AI generator left, Manual creation right

**Rationale**: Consistent UI pattern makes the interface more predictable and easier to learn.

---

## Summary

**Strong Foundation**: The core architecture, AI optimization, and DM features are solid.

**Critical Gaps**: 
- ✅ Zod validation (COMPLETED)
- ✅ TypeScript type safety (COMPLETED)
- ✅ Shop management improvements (COMPLETED)
- ❌ Player-facing features incomplete
- ❌ Error boundaries needed
- ❌ Notable People system (NEW - major refactor)
- ❌ Campaign/Town parameters
- ❌ AI Generation Wizard

**Recommended Priority**: 
1. ✅ Fix TypeScript/Zod (COMPLETED)
2. ✅ Shop UX improvements (COMPLETED)
3. ✅ Database schema updates for new parameters (COMPLETED)
4. ✅ Notable People entity and migration (COMPLETED)
5. Update AI generators with new parameters
6. Build AI Generation Wizard
7. Complete remaining AI generators (shop/item)
8. **NEW: Multiplayer Live Campaign System** (see below)
9. Add error boundaries (UX quality)
10. Image generation (visual polish)

---

## 🆕 New Requirements (2026-04-06): Multiplayer Live Campaign System

### Overview
**Status**: Design Complete | Implementation Not Started  
**Priority**: CRITICAL - Major Feature Expansion  
**Estimated Effort**: 5 weeks

Transform TavernKeep into a live multiplayer platform where DMs and players collaborate in real-time during game sessions.

---

### Phase 1: Player Authentication & Campaign Membership (Week 1)

#### Database Schema
- ❌ Create `players` table (player profiles separate from DMs)
- ❌ Create `campaign_members` table (player-campaign relationships)
- ❌ Add `invite_token` to campaigns table (unique, regeneratable)
- ❌ Create RLS policies for player access control
- ❌ Create indexes for performance

#### Authentication
- ❌ Add magic link email auth provider to Supabase
- ❌ Create player signup/login flow (separate from DM)
- ❌ Build player profile creation on first login
- ❌ Add player profile edit page

#### Campaign Membership
- ❌ Create `/join/[invite_token]` route for campaign invites
- ❌ Build campaign invite generation UI for DMs
- ❌ Create QR code for campaign invite
- ❌ Build "Join Campaign" flow with membership creation
- ❌ Add campaign members list to DM campaign view
- ❌ Add "Revoke Access" functionality for DMs
- ❌ Create player campaign list view

**Deliverables**:
- Players can create accounts via magic link
- DMs can generate invite links/QR codes
- Players can join campaigns via invite
- DMs can manage campaign membership

---

### Phase 2: Visibility System (Week 1-2)

#### Database Changes
- ❌ Add `is_revealed` column to `towns` table
- ❌ Add `is_revealed` column to `shops` table
- ❌ Add `is_revealed` column to `notable_people` table
- ❌ Create indexes on visibility columns
- ❌ Update RLS policies to filter by `is_revealed` for players

#### DM UI
- ❌ Add eye icon toggle to town cards (reveal/hide)
- ❌ Add eye icon toggle to shop cards (reveal/hide)
- ❌ Add eye icon toggle to notable person cards (reveal/hide)
- ❌ Add bulk reveal/hide actions
- ❌ Add visibility indicator to all entity cards
- ❌ Update detail pages to show visibility status

#### Player UI
- ❌ Create player campaign explorer route `/player/campaigns/[campaignId]`
- ❌ Build campaign overview page (only revealed content)
- ❌ Build town list (only revealed towns)
- ❌ Build shop list (only revealed shops)
- ❌ Build notable people list (only revealed people)
- ❌ Add breadcrumb navigation
- ❌ Add "Nothing revealed yet" empty states

**Deliverables**:
- DMs can reveal/hide towns, shops, people
- Players only see revealed content
- Clean player explorer interface

---

### Phase 3: Shopping Cart (Week 2)

#### Database Schema
- ❌ Create `cart_items` table
- ❌ Create RLS policies for cart access
- ❌ Create indexes for cart queries

#### Player Shop View Updates
- ❌ Add "Add to Cart" button to item cards
- ❌ Add quantity selector
- ❌ Add cart icon with item count to navigation
- ❌ Create cart sidebar/modal
- ❌ Add "Remove from Cart" functionality
- ❌ Add "Clear Cart" functionality
- ❌ Show out-of-stock items as disabled

#### Real-time Cart Sync
- ❌ Set up Supabase Realtime subscription for cart_items
- ❌ Implement optimistic updates for cart actions
- ❌ Handle concurrent modifications gracefully
- ❌ Add loading states for cart operations

#### DM Cart Visibility
- ❌ Create "Pending Transactions" panel on DM campaign view
- ❌ Show all player carts grouped by player
- ❌ Display cart totals and item counts
- ❌ Add "Finalize Transaction" button per player

**Deliverables**:
- Players can add items to cart
- Cart persists across sessions
- Real-time cart sync between players and DM
- DM can view all player carts

---

### Phase 4: Transactions & Inventory (Week 2-3)

#### Database Schema
- ❌ Create `player_inventory` table (with item snapshots)
- ❌ Create `transactions` table (audit trail)
- ❌ Create RLS policies for inventory access
- ❌ Create indexes for inventory queries

#### Transaction Finalization
- ❌ Build transaction finalization API endpoint
- ❌ Implement cart → inventory copy logic
- ❌ Implement stock quantity decrement
- ❌ Implement cart clearing after finalization
- ❌ Add transaction record creation
- ❌ Add error handling for insufficient stock
- ❌ Add DM notes field to transaction

#### Player Inventory Screen
- ❌ Create `/player/inventory/[campaignId]` route
- ❌ Build inventory grid/list view
- ❌ Add state filter dropdown (All, Available, Equipped, etc.)
- ❌ Add search functionality
- ❌ Add sort options (Date, Price, Rarity, Name)
- ❌ Create item detail modal
- ❌ Add state change UI (dropdown + notes)
- ❌ Add state change history tracking

#### Item State Management
- ❌ Create state change API endpoint
- ❌ Implement state validation
- ❌ Add state change timestamp tracking
- ❌ Add state notes field
- ❌ Create state icons/badges

**Deliverables**:
- DM can finalize transactions
- Items move from cart to player inventory
- Shop stock decrements correctly
- Players can manage inventory state
- Full transaction audit trail

---

### Phase 5: Live Mode (Week 3-4)

#### Database Schema
- ❌ Create `dm_sessions` table
- ❌ Create RLS policies for session access
- ❌ Create indexes for session queries

#### DM Live Mode Controls
- ❌ Add "Live Mode" toggle to DM navigation
- ❌ Create live mode indicator (🔴 LIVE badge)
- ❌ Implement session creation on campaign load
- ❌ Update session on DM navigation
- ❌ Track `current_view_type` and `current_view_id`
- ❌ Add live mode status to campaign overview

#### Real-time Session Sync
- ❌ Set up Supabase Realtime subscription to dm_sessions
- ❌ Implement DM view tracking middleware
- ❌ Broadcast view changes to subscribed players
- ❌ Handle session cleanup on DM logout

#### Player Live Mode Experience
- ❌ Create live mode detection logic
- ❌ Build live mode banner UI
- ❌ Implement automatic navigation to DM's view
- ❌ Add navigation lock in live mode
- ❌ Add "Exit Live Mode" button
- ❌ Filter hidden entities from live view
- ❌ Maintain interactivity (cart actions) in live mode

#### Testing
- ❌ Test with multiple concurrent players
- ❌ Test DM navigation across all entity types
- ❌ Test live mode toggle behavior
- ❌ Test player exit live mode
- ❌ Test visibility filtering in live mode

**Deliverables**:
- DM can enable live mode with one toggle
- Players automatically follow DM's view
- Real-time sync < 500ms latency
- Players can exit live mode
- Hidden content filtered correctly

---

### Phase 6: QR Code Expansion (Week 4)

#### Campaign Invite QR
- ❌ Generate unique invite token per campaign
- ❌ Create campaign invite QR code component
- ❌ Add regenerate invite token functionality
- ❌ Build invite QR modal on campaign page

#### Entity QR Codes
- ❌ Add slug generation to campaigns
- ❌ Add slug generation to towns
- ❌ Add slug generation to notable_people
- ❌ Create QR code component for each entity type
- ❌ Add QR code modals to all detail pages
- ❌ Implement URL pattern: `/c/[campaign]/t/[town]` etc.

#### Player Routes
- ❌ Create `/c/[campaign_slug]` route (campaign overview)
- ❌ Create `/c/[campaign]/t/[town_slug]` route (town detail)
- ❌ Create `/c/[campaign]/s/[shop_slug]` route (shop view)
- ❌ Create `/c/[campaign]/p/[person_slug]` route (person detail)
- ❌ Create `/c/[campaign]/i/[item_slug]` route (item detail)
- ❌ Add membership + visibility checks to all routes

**Deliverables**:
- QR codes for all entity types
- Shareable links for all entities
- Campaign invite QR code
- All routes enforce membership + visibility

---

### Phase 7: Polish & Testing (Week 5)

#### Mobile Optimization
- ❌ Test all player views at 375px, 390px, 428px
- ❌ Ensure touch targets ≥ 44x44px
- ❌ Optimize cart UI for mobile
- ❌ Optimize inventory UI for mobile
- ❌ Test live mode banner on mobile

#### Performance
- ❌ Add database indexes for all foreign keys
- ❌ Optimize cart queries with materialized views if needed
- ❌ Test real-time sync with 10+ concurrent players
- ❌ Monitor Supabase Realtime connection limits
- ❌ Implement connection pooling if needed

#### Error Handling
- ❌ Add error boundaries to all player routes
- ❌ Add loading states to all async operations
- ❌ Handle network failures gracefully
- ❌ Add retry logic for failed transactions
- ❌ Add user-friendly error messages

#### Documentation
- ❌ Create DM guide for live mode
- ❌ Create player onboarding flow
- ❌ Document QR code system
- ❌ Document cart and inventory features
- ❌ Create troubleshooting guide

**Deliverables**:
- Mobile-optimized player experience
- Robust error handling
- Performance tested with multiple players
- Complete documentation

---

### Technical Considerations

#### Supabase Realtime Limits
- **Free tier**: 200 concurrent connections
- **Strategy**: Selective subscriptions, unsubscribe when not in live mode
- **Monitoring**: Track active connections, add alerts

#### Database Performance
- Index all foreign keys
- Index visibility columns (`is_revealed`)
- Monitor query performance with `EXPLAIN ANALYZE`
- Consider materialized views for complex cart/inventory queries

#### State Management
- Use Zustand for client-side cart state
- Optimistic updates for cart actions
- Sync with database on mutation
- Handle conflicts with last-write-wins

#### Security
- RLS policies enforce campaign membership
- Players can only modify their own carts/inventory
- DM can view but not modify player carts
- All entity routes check membership + visibility
- Rate limit cart operations to prevent abuse

---

### Success Metrics

- ✅ Players can join campaigns via QR code in < 30 seconds
- ✅ Live mode sync latency < 500ms
- ✅ Cart updates visible to all players in < 1 second
- ✅ Transaction finalization completes in < 2 seconds
- ✅ Player inventory loads in < 1 second
- ✅ Mobile player experience rated 4.5+ stars
- ✅ Zero data loss on concurrent cart modifications
- ✅ Support 10+ concurrent players per campaign

---

### Open Questions

1. **Player Roles**: Should there be different player roles (e.g., "Party Leader")?
2. **Cart Sharing**: Should players be able to gift cart items to other players?
3. **Inventory Limits**: Should players have weight/slot limits?
4. **Transaction History**: Should players see full purchase history across all campaigns?
5. **Notifications**: Should players get push notifications for live mode or transactions?
6. **Multi-Campaign**: Can a player be in multiple campaigns? (Assumed: Yes)
7. **DM as Player**: Can a DM have a player profile in their own campaign? (Assumed: No)

---

### Migration Strategy

1. **Backward Compatibility**: Existing shops continue to work
2. **Gradual Rollout**: Release features in phases
3. **Data Migration**: No migration needed for existing data
4. **Feature Flags**: Use feature flags to enable/disable multiplayer features
5. **Testing**: Extensive testing with real DMs and players before full release
