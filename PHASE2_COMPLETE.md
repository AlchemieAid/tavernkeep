# ✅ Phase 2 Complete: Visibility System

## What Was Built

### Database Layer
✅ **Migration Created**: `supabase/migrations/20260406_phase2_visibility.sql`
- Added `is_revealed` column to `towns`, `shops`, and `notable_people` (default: false)
- Created indexes for visibility filtering queries
- Added RLS policies for player access (only see revealed content)
- Added documentation comments on columns

### TypeScript Types
✅ **Updated**: `types/database.ts`
- Added `is_revealed: boolean` to `Town`, `Shop`, and `NotablePerson` interfaces

### DM Visibility Controls
✅ **Component Created**: `components/dm/visibility-toggle.tsx`
- Reusable toggle button for towns, shops, and notable people
- Shows "Revealed to Players" (green) or "Hidden from Players" (gray)
- Real-time updates with router refresh

✅ **Updated DM Pages**:
- `app/dm/towns/[townId]/page.tsx` - Added visibility toggle to town header
- `app/dm/shops/[shopId]/page.tsx` - Added visibility toggle to shop header

### Player Campaign Explorer
✅ **Routes Created**:
- `/player/campaigns/[campaignId]` - Campaign overview with revealed towns
- `/player/campaigns/[campaignId]/towns/[townId]` - Town detail with revealed shops and people

**Features**:
- Only shows revealed content (enforced by RLS policies)
- Character management section
- Town exploration with shops and notable people
- Clean, mobile-friendly UI
- Empty states when nothing revealed yet

---

## How It Works

### DM Flow:
1. DM creates towns, shops, and notable people (all hidden by default)
2. DM clicks visibility toggle to reveal content to players
3. Toggle shows current state: "Revealed to Players" or "Hidden from Players"
4. Changes take effect immediately

### Player Flow:
1. Player navigates to campaign at `/player/campaigns/[campaignId]`
2. Sees only revealed towns
3. Clicks "Explore Town" to see revealed shops and notable people
4. Cannot see hidden content (enforced by database RLS policies)

### Security:
- **RLS Policies**: Database-level security ensures players can only query revealed content
- **Campaign Membership**: Players must be active members to see any content
- **Hierarchical Visibility**: Shops/people in hidden towns are also hidden

---

## Migration Instructions

### Production Deployment

**Option 1: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260406_phase2_visibility.sql`
5. Paste and click **Run**

**Option 2: Supabase CLI** (if project linked)
```bash
npx supabase db push
```

### Verify Migration
After running the migration:
1. Check that `towns`, `shops`, and `notable_people` tables have `is_revealed` column
2. All existing content should be `is_revealed = false` (hidden by default)
3. Reveal some content using the DM toggles
4. Test player view to confirm only revealed content appears

---

## Testing Checklist

- [ ] Run Phase 2 migration on production Supabase
- [ ] DM can toggle town visibility
- [ ] DM can toggle shop visibility
- [ ] Player sees only revealed towns in campaign view
- [ ] Player sees only revealed shops in town view
- [ ] Player cannot access hidden content via direct URL
- [ ] Visibility changes reflect immediately
- [ ] Empty states display when nothing revealed

---

## Next Steps (Phase 3)

**Shopping Cart with Item Locking** - Week 2
- Create `cart_items` table with character_id and locked_at
- Implement item locking (prevent duplicate adds)
- Build cart conflict detection (one shop at a time)
- Add cart UI to player shop view
- Create DM "Pending Transactions" panel

---

## Files Changed

**New Files** (4):
- `supabase/migrations/20260406_phase2_visibility.sql`
- `components/dm/visibility-toggle.tsx`
- `app/player/campaigns/[campaignId]/page.tsx`
- `app/player/campaigns/[campaignId]/towns/[townId]/page.tsx`

**Modified Files** (3):
- `types/database.ts` - Added is_revealed fields
- `app/dm/towns/[townId]/page.tsx` - Added visibility toggle
- `app/dm/shops/[shopId]/page.tsx` - Added visibility toggle

---

## Architecture Highlights

✅ **Database-Level Security**: RLS policies enforce visibility at query level  
✅ **Default Hidden**: All new content hidden until DM reveals it  
✅ **Hierarchical**: Shops/people inherit town visibility requirements  
✅ **Real-time Updates**: Changes reflect immediately via router refresh  
✅ **Mobile-First**: Player UI designed for mobile devices  
✅ **Empty States**: Clear messaging when no content revealed yet  

---

## Known Limitations

**Notable People Detail Page**: Not yet implemented
- Players can see notable people in town list
- Clicking "View Details" will 404 (to be implemented in future phase)

**Shop Detail Page**: Not yet implemented for players
- Players can see shops in town list
- Clicking "Browse Shop" will 404 (to be implemented in Phase 3 with cart)

---

**Phase 2 Status**: ✅ **COMPLETE**  
**Ready for Phase 3**: ✅ **YES** (after migration runs)  
**Deployed to GitHub**: ✅ **YES**  
**Migration Applied**: ⏳ **PENDING** (user must run on production)
