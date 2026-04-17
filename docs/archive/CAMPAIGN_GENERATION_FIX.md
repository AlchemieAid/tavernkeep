# Campaign Generation "Network Error" Fix

## Problem

Users are getting "Generation Failed network error" when trying to create campaigns. This works for you but not for others.

## Root Causes Found

### 1. **Missing OpenAI API Key Check in `/api/dm/generate-world`**
   
**File:** `app/api/dm/generate-world/route.ts`

**Issue:** The endpoint doesn't validate that `OPENAI_API_KEY` exists before starting generation. The orchestrator creates an OpenAI client with an empty string if the key is missing, which causes cryptic network errors later.

**Other endpoints check this:**
```typescript
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not configured')
  return NextResponse.json(
    { data: null, error: { message: 'AI service not configured' } },
    { status: 500 }
  )
}
```

**But `/api/dm/generate-world` does NOT have this check!**

---

### 2. **Orchestrator Creates Invalid OpenAI Client**

**File:** `lib/generation/orchestrator.ts:67`

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',  // ← Empty string if missing!
})
```

This creates an OpenAI client with an empty API key, which will fail with network errors when it tries to make requests.

---

### 3. **Rate Limit Check Can Fail Silently**

**File:** `lib/rate-limit.ts:247`

```typescript
if (!supabase) {
  const { createClient } = await import('@/lib/supabase/server')
  supabase = await createClient()
}
```

If the dynamic import fails or Supabase connection fails, this could throw a network error that bubbles up as "Generation Failed network error".

---

### 4. **Aggressive Timeouts May Cause False Failures**

**File:** `lib/generation/orchestrator.ts`

- Database connection timeout: 10 seconds (line 302)
- Rate limit check timeout: 2 seconds (line 375)
- OpenAI generation timeout: 60 seconds (line 399)

For users with slow connections or in different regions, these timeouts might be too aggressive.

---

## Why It Works For You But Not Others

1. **You have `OPENAI_API_KEY` in your environment** - Other users might not
2. **You're in a fast network region** - Other users might have slower connections
3. **Your Supabase instance is warm** - Other users hit cold starts
4. **You're an admin** - Other users might hit different RLS policies

---

## Fixes Required

### Fix 1: Add API Key Check to `/api/dm/generate-world`

```typescript
// Add after user authentication check (line 31)
if (!process.env.OPENAI_API_KEY) {
  return new Response(
    JSON.stringify({ error: 'AI service not configured' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Fix 2: Validate OpenAI API Key in Orchestrator

```typescript
// In orchestrator.ts constructor or initialization
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set')
}
```

### Fix 3: Better Error Messages

Update error handling to distinguish between:
- Network errors (connection failed)
- API errors (OpenAI rejected request)
- Configuration errors (missing API key)
- Rate limit errors (too many requests)

### Fix 4: Increase Timeouts for Production

```typescript
// More generous timeouts for production
const DB_TIMEOUT = 30000  // 30s instead of 10s
const RATE_LIMIT_TIMEOUT = 5000  // 5s instead of 2s
const OPENAI_TIMEOUT = 120000  // 120s instead of 60s
```

### Fix 5: Add Retry Logic

Add exponential backoff retry for transient network errors:
- Retry OpenAI requests up to 3 times
- Retry database queries up to 2 times
- Don't retry on 4xx errors (client errors)

---

## Testing Checklist

- [ ] Test with missing `OPENAI_API_KEY`
- [ ] Test with invalid `OPENAI_API_KEY`
- [ ] Test with slow network connection
- [ ] Test from different geographic regions
- [ ] Test with cold Supabase instance
- [ ] Test with non-admin user
- [ ] Test with rate limit exceeded
- [ ] Check error messages are user-friendly

---

## Deployment Steps

1. Add `OPENAI_API_KEY` check to `/api/dm/generate-world`
2. Add validation to orchestrator
3. Increase timeouts
4. Deploy to Vercel
5. Monitor error logs for "network error" occurrences
6. Add retry logic if issues persist

---

## Monitoring

After deployment, monitor for:
- `OPENAI_API_KEY is not configured` errors
- OpenAI API timeout errors
- Database connection timeout errors
- Rate limit check timeout errors

These will help identify which specific issue users are hitting.
