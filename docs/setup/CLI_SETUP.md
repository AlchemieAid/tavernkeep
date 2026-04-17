# Supabase CLI Setup Guide - CORRECT WORKFLOW

## 🎯 The Simple Truth

Supabase branches are for **GitHub integration**, not CLI merging. For direct CLI workflow, you just push migrations straight to production. Here's the correct approach:

---

## ✅ Step 1: Login to Supabase CLI

```bash
npx supabase login
```

Follow the browser prompt to authenticate.

## ✅ Step 2: Link Your Local Project

```bash
npx supabase link
```

It will show you a list of your projects. Select your TavernKeep project.

**OR** if you know your project ref:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Get your project ref from: Dashboard → Project Settings → General → Reference ID

## ✅ Step 3: Check What's Already Applied

See which migrations are already in production:

```bash
npx supabase migration list --linked
```

This shows:
- ✅ Green = Already applied
- ⏸️ Gray = Not yet applied

## ✅ Step 4: Push All Migrations to Production

This is the magic command:

```bash
npx supabase db push
```

This will:
1. Compare your local `supabase/migrations/` folder with production
2. Apply any missing migrations in order
3. Skip migrations that are already applied

**That's it!** No branches, no merge, just push.

---

## 🔒 Want to Test First? Use a Preview Branch

If you want to test migrations safely before production:

### Create a Preview Branch (via Dashboard)

1. Go to Supabase Dashboard → Branches
2. Click "Create Preview Branch"
3. Name it `dev-migrations`
4. Get the connection string

### Push to Preview Branch

```bash
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@[BRANCH-URL]:5432/postgres"
```

### Test Your App

Update `.env.local` temporarily:
```
NEXT_PUBLIC_SUPABASE_URL=https://[branch-id].supabase.co
```

### Deploy to Production (via Dashboard)

Once tested, go to Dashboard → Branches → Click "Promote to Production"

This merges the branch database state to production.

## 🔄 Future Workflow

After this one-time setup, whenever you create a new migration:

```bash
# 1. Create migration file
npx supabase migration new my_feature_name

# 2. Edit the generated file in supabase/migrations/
# Add your SQL changes

# 3. Push to production
npx supabase db push
```

**That's it!** No more manual SQL, no branches needed for simple workflows.

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

