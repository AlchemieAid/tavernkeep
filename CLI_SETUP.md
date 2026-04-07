# Supabase CLI Setup Guide

## ✅ Step 1: Get Your Project Reference ID

1. Go to https://supabase.com/dashboard
2. Select your TavernKeep project
3. Click **Project Settings** (gear icon in sidebar)
4. Under **General** → **Reference ID**, copy the ID (looks like `abcdefghijklmnop`)

## ✅ Step 2: Link Your Local Project

Run this command and paste your project ref when prompted:

```bash
npx supabase link
```

It will ask:
- **Project ref**: Paste the ID from step 1
- **Database password**: Your database password (from Supabase dashboard)

## ✅ Step 3: Create a Development Branch

```bash
npx supabase branches create dev-migrations
```

This creates a safe testing environment separate from production.

## ✅ Step 4: Check Migration Status

```bash
npx supabase db remote list
```

This shows which migrations are already applied to production.

## ✅ Step 5: Push Migrations to Branch

```bash
npx supabase db push --db-url <branch-connection-string>
```

Get the branch connection string from:
```bash
npx supabase branches get dev-migrations
```

## ✅ Step 6: Test on Branch

1. Update your `.env.local` to point to the branch database temporarily
2. Test the app
3. Verify everything works

## ✅ Step 7: Merge to Production

Once tested:

```bash
npx supabase branches merge dev-migrations
```

This applies all migrations to production safely!

## 🔄 Future Workflow

After this one-time setup, whenever you create a new migration:

```bash
# Create migration file
npx supabase migration new my_feature_name

# Edit the generated file in supabase/migrations/

# Push to production
npx supabase db push
```

That's it! No more manual SQL.

---

## 🆘 Troubleshooting

### "Cannot find project"
Make sure you're logged in:
```bash
npx supabase login
```

### "Database password incorrect"
Get it from: Project Settings → Database → Database Password → Reset if needed

### "Docker not running"
You don't need Docker for remote-only workflow. Just use `npx supabase db push` directly.

