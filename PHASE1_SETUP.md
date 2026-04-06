# Phase 1 Setup Instructions

## ✅ Local Development Setup (Docker Required)

### 1. Start Local Supabase

```bash
npx supabase start
```

This will:
- Pull all necessary Docker images
- Start local Supabase services
- **Automatically apply all migrations** including Phase 1
- Display local URLs and credentials

### 2. Configure Environment Variables

Create `.env.local` in your project root with these values:

```env
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: The anon key shown above is the default local development key. Your actual key will be displayed when you run `npx supabase start`.

### 3. Start Next.js Dev Server

```bash
npm run dev
```

Your app will be available at `http://localhost:3000`

---

## 🌐 Production Setup (Supabase Dashboard)

### Option 1: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260406_multiplayer_phase1.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Supabase CLI (Linked Project)

```bash
npx supabase db push
```

This will push all pending migrations to your remote Supabase project.

---

## 🔧 Local Development URLs

When running `npx supabase start`, you'll have access to:

- **Studio**: http://127.0.0.1:54323 (Database management UI)
- **Mailpit**: http://127.0.0.1:54324 (Email testing - magic links appear here!)
- **API**: http://127.0.0.1:54321
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

**Important**: Magic link emails in local development go to **Mailpit**, not your actual email. Open http://127.0.0.1:54324 to see them!

---

## Enable Magic Link Authentication (Production Only)

For production Supabase:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Email** provider
3. Enable **Email** if not already enabled
4. Under **Email Auth**, ensure **Enable Email Confirmations** is checked
5. **Save** changes

**Local development**: Email is enabled by default, emails go to Mailpit.

---

## Test the Flow

### Player Flow (Local):
1. Navigate to `http://localhost:3000/player/login`
2. Enter any email (e.g., `player@test.com`) and click "Send Magic Link"
3. Open **Mailpit** at http://127.0.0.1:54324
4. Click the magic link email
5. Click the link in the email → redirected to `/player/profile/create`
6. Create player profile
7. Redirected to `/player/campaigns` (empty state)

### DM Flow (Local):
1. Navigate to `http://localhost:3000/login`
2. Sign in with Google OAuth (or use magic link via Mailpit)
3. Create a campaign at `/dm/dashboard`
4. Click "Invite Players" button on campaign page
5. QR code and invite link displayed
6. Share invite link with player

### Full Integration Test:
1. Open campaign as DM, copy invite link
2. Open incognito window, paste invite link
3. Sign in as player (different email)
4. Create character
5. Verify character appears in campaign

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
- **Local**: Check Mailpit at http://127.0.0.1:54324 (emails don't go to real inbox)
- **Production**: Check spam folder, verify email provider is enabled in Supabase

**"Invalid invite" error?**
- Ensure migration has run (campaigns table needs `invite_token` column)
- Check Studio at http://127.0.0.1:54323 to verify table structure
- Run `npx supabase db reset` to reapply all migrations

**TypeScript errors won't go away?**
- Restart TypeScript server in VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- The errors in `/join/[token]/page.tsx` are expected until you restart the TS server

**Supabase won't start?**
- Ensure Docker Desktop is running
- Run `npx supabase stop` then `npx supabase start`
- Check Docker Desktop for error logs

**Port conflicts?**
- Supabase uses ports 54321-54324
- Stop other services using these ports
- Or configure custom ports in `supabase/config.toml`
