# Phase 1 Setup Instructions

## Database Migration

You need to run the Phase 1 migration on your Supabase database to create the new tables for players, characters, and campaign membership.

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260406_multiplayer_phase1.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Supabase CLI (If Docker is installed)

```bash
npx supabase db reset
```

This will reset your local database and apply all migrations including the new Phase 1 migration.

---

## Enable Magic Link Authentication

To allow players to sign in with email magic links:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Email** provider
3. Enable **Email** if not already enabled
4. Under **Email Auth**, ensure **Enable Email Confirmations** is checked
5. **Save** changes

---

## Test the Flow

### Player Flow:
1. Navigate to `/player/login`
2. Enter email and click "Send Magic Link"
3. Check email for magic link
4. Click link → redirected to `/player/profile/create`
5. Create player profile
6. Redirected to `/player/campaigns` (empty state)

### DM Flow (after next step):
1. DM creates campaign
2. DM generates invite link/QR code
3. DM shares invite link with players
4. Players click link → join campaign → create character

---

## Next Steps

After running the migration:
1. Add DM campaign invite UI (in progress)
2. Test end-to-end player join flow
3. Proceed to Phase 2: Visibility System

---

## TypeScript Errors

You may see TypeScript errors in the new player routes. These are expected and will resolve once:
1. The migration runs on your database
2. Supabase generates updated types (happens automatically)

If errors persist after migration, regenerate types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

---

## Troubleshooting

**Magic link not arriving?**
- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase logs for email delivery errors

**"Invalid invite" error?**
- Ensure migration has run (campaigns table needs `invite_token` column)
- Check that invite token matches in database

**TypeScript errors won't go away?**
- Restart TypeScript server in VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Regenerate Supabase types (see above)
