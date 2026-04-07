# Database Migration Guide

## 🚀 Quick Fix: Run All Migrations at Once

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste **ALL** the SQL from the files below, **IN ORDER**:

```sql
-- ============================================================================
-- MIGRATION 1: Initial Schema (20260401)
-- ============================================================================
```

Then paste the contents of: `supabase/migrations/20260401_initial_schema.sql`

```sql
-- ============================================================================
-- MIGRATION 2: Auto Create Profile (20260402)
-- ============================================================================
```

Then paste: `supabase/migrations/20260402_auto_create_profile.sql`

```sql
-- ============================================================================
-- MIGRATION 3: Activate Existing Shops (20260403)
-- ============================================================================
```

Then paste: `supabase/migrations/20260403_activate_existing_shops.sql`

```sql
-- ============================================================================
-- MIGRATION 4: AI Usage Tracking (20260404)
-- ============================================================================
```

Then paste: `supabase/migrations/20260404_create_ai_usage_tracking.sql`

```sql
-- ============================================================================
-- MIGRATION 5: Multiplayer Phase 1 (20260406)
-- ============================================================================
```

Then paste: `supabase/migrations/20260406_multiplayer_phase1.sql`

```sql
-- ============================================================================
-- MIGRATION 6: Phase 2 Visibility (20260407)
-- ============================================================================
```

Then paste: `supabase/migrations/20260407_phase2_visibility.sql`

```sql
-- ============================================================================
-- MIGRATION 7: Fix Invite Lookup (20260408)
-- ============================================================================
```

Then paste: `supabase/migrations/20260408_fix_invite_lookup.sql`

```sql
-- ============================================================================
-- MIGRATION 8: Shopping Cart (20260409) - CRITICAL FOR BAG FEATURE
-- ============================================================================
```

Then paste: `supabase/migrations/20260409_phase3_shopping_cart.sql`

```sql
-- ============================================================================
-- MIGRATION 9: Fix Items RLS (20260410)
-- ============================================================================
```

Then paste: `supabase/migrations/20260410_fix_items_rls.sql`

```sql
-- ============================================================================
-- MIGRATION 10: Campaign Currency (20260411)
-- ============================================================================
```

Then paste: `supabase/migrations/20260411_add_campaign_currency.sql`

5. Click **Run** to execute all migrations at once
6. Update your campaign currency:

```sql
UPDATE campaigns
SET currency = 'sh'
WHERE id = 'ee954fca-a326-4f78-9d06-5e742015bcd5';
```

---

## ⚠️ If You Get Errors

If you get errors like "table already exists", it means some migrations already ran. You have two options:

### Option A: Skip Already-Run Migrations
- Only run the migrations that haven't been applied yet
- Start from migration 8 (shopping cart) if earlier ones already exist

### Option B: Fresh Start (Nuclear Option)
**WARNING: This deletes ALL data!**

1. Go to Database → Settings in Supabase Dashboard
2. Click "Reset Database"
3. Run ALL 10 migrations in order

---

## 🔄 Future Workflow (After This One-Time Fix)

Once all migrations are applied, here's how to handle new ones:

### When You Create a New Migration:

1. **Create the file** in `supabase/migrations/` with timestamp format:
   ```
   YYYYMMDD_description.sql
   ```

2. **Test locally** (optional):
   ```bash
   npx supabase db reset
   ```

3. **Apply to production**:
   - Go to Supabase Dashboard → SQL Editor
   - Paste the new migration SQL
   - Click Run

### Or Set Up CLI (One-Time Setup):

```bash
# Install Supabase CLI globally
npm install -g supabase

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push
```

Your project ref is in: Project Settings → General → Reference ID

---

## ✅ How to Verify Migrations Worked

After running migrations, check:

1. **Tables exist**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

2. **Cart items table exists**:
   ```sql
   SELECT * FROM cart_items LIMIT 1;
   ```

3. **Currency column exists**:
   ```sql
   SELECT currency FROM campaigns LIMIT 1;
   ```

---

## 🎯 What This Fixes

- ✅ Shopping bag will work (cart_items table)
- ✅ Currency will display correctly
- ✅ All RLS policies will be in place
- ✅ Real-time updates will work
- ✅ No more manual SQL commands needed

