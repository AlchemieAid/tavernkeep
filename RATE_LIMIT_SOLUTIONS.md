# Rate Limit Solutions & Best Practices

## 🚨 The Problem

You're hitting rate limits on:
- **Supabase** - Connection limits, query limits
- **OpenAI** - Token limits, requests per minute
- **Vercel** - Function execution time limits

---

## ✅ **Proven Solutions**

### **1. Connection Pooling (Supabase)**

**Problem:** Each serverless function creates a new database connection, exhausting connection limits.

**Solution:** Use Supabase connection pooling with transaction mode.

#### **Update Your Database URL:**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component
          }
        },
      },
      db: {
        // Use connection pooling
        schema: 'public',
      },
      global: {
        // Use transaction mode for pooling
        fetch: (...args) => fetch(...args),
      },
    }
  )
}
```

#### **Supabase Dashboard Settings:**

1. Go to **Settings → Database**
2. Enable **Connection Pooling**
3. Use **Transaction Mode** (not Session Mode)
4. Connection string format:
   ```
   postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

**Impact:** Reduces connections from 100+ to ~10

---

### **2. Supavisor (Supabase's Built-in Pooler)**

Supabase now includes **Supavisor** - a connection pooler that's automatically enabled.

**How to Use:**

```bash
# In your .env.local
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

**Benefits:**
- ✅ Handles 1000s of connections
- ✅ Automatic failover
- ✅ No code changes needed
- ✅ Free on all plans

---

### **3. OpenAI Rate Limits**

**Problem:** Hitting requests-per-minute (RPM) or tokens-per-minute (TPM) limits.

**Solutions:**

#### **A. Exponential Backoff with Retry**

```typescript
// lib/openai/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (error?.status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000
        console.log(`Rate limited, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// Usage
const completion = await retryWithBackoff(() =>
  openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  })
)
```

#### **B. Request Queuing**

```typescript
// lib/openai/queue.ts
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private requestsPerMinute = 50 // Adjust based on your tier
  private requestCount = 0
  private resetTime = Date.now() + 60000

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      // Reset counter every minute
      if (Date.now() > this.resetTime) {
        this.requestCount = 0
        this.resetTime = Date.now() + 60000
      }

      // Wait if we've hit the limit
      if (this.requestCount >= this.requestsPerMinute) {
        const waitTime = this.resetTime - Date.now()
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.requestCount = 0
        this.resetTime = Date.now() + 60000
      }

      const fn = this.queue.shift()
      if (fn) {
        this.requestCount++
        await fn()
      }
    }

    this.processing = false
  }
}

export const openaiQueue = new RequestQueue()

// Usage
const result = await openaiQueue.add(() =>
  openai.chat.completions.create({...})
)
```

#### **C. Upgrade Your OpenAI Tier**

| Tier | RPM | TPM | Cost |
|------|-----|-----|------|
| **Free** | 3 | 40k | $0 |
| **Tier 1** | 500 | 200k | $5+ spent |
| **Tier 2** | 5,000 | 2M | $50+ spent |
| **Tier 3** | 10,000 | 10M | $1,000+ spent |

**Recommendation:** Spend $50 to unlock Tier 2 (100x more requests)

---

### **4. Caching Strategies**

#### **A. Cache AI Responses**

```typescript
// lib/cache/ai-cache.ts
import { createClient } from '@/lib/supabase/server'

export async function getCachedOrGenerate<T>(
  cacheKey: string,
  generateFn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const supabase = await createClient()

  // Check cache
  const { data: cached } = await supabase
    .from('ai_cache')
    .select('response, created_at')
    .eq('cache_key', cacheKey)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.created_at).getTime()
    if (age < ttlSeconds * 1000) {
      return JSON.parse(cached.response)
    }
  }

  // Generate new
  const result = await generateFn()

  // Store in cache
  await supabase
    .from('ai_cache')
    .upsert({
      cache_key: cacheKey,
      response: JSON.stringify(result),
      created_at: new Date().toISOString()
    })

  return result
}
```

#### **B. Redis for High-Performance Caching**

```typescript
// Use Upstash Redis (free tier: 10k commands/day)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key)
  return cached as T | null
}

export async function setCache<T>(key: string, value: T, ttl = 3600): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value))
}
```

---

### **5. Batch Operations**

Instead of making 10 separate requests, batch them:

```typescript
// ❌ Bad - 10 requests
for (const shop of shops) {
  await generateItems(shop.id)
}

// ✅ Good - 1 request
await generateItemsForShops(shops.map(s => s.id))
```

---

### **6. Serverless Function Optimization**

#### **A. Increase Timeout (Vercel)**

```json
// vercel.json
{
  "functions": {
    "app/api/dm/generate-world/route.ts": {
      "maxDuration": 300
    }
  }
}
```

**Note:** Pro plan allows up to 300s (5 min)

#### **B. Use Edge Functions for Light Tasks**

```typescript
// app/api/light-task/route.ts
export const runtime = 'edge' // No cold starts, faster

export async function GET() {
  // Quick operations only
}
```

---

### **7. Database Query Optimization**

```typescript
// ❌ Bad - N+1 queries
const campaigns = await supabase.from('campaigns').select('*')
for (const campaign of campaigns.data) {
  const towns = await supabase
    .from('towns')
    .select('*')
    .eq('campaign_id', campaign.id)
}

// ✅ Good - Single query with join
const { data } = await supabase
  .from('campaigns')
  .select(`
    *,
    towns (*)
  `)
```

---

## 🎯 **Recommended Stack for Your App**

### **Immediate (Free):**
1. ✅ Enable Supabase connection pooling
2. ✅ Add retry logic with exponential backoff
3. ✅ Implement request queuing for OpenAI
4. ✅ Cache common AI responses in Supabase

### **Short-term ($5-20/month):**
1. 💰 Upgrade OpenAI to Tier 2 ($50 spend)
2. 💰 Add Upstash Redis for caching ($0-10/month)
3. 💰 Vercel Pro for longer timeouts ($20/month)

### **Long-term (Scale):**
1. 🚀 Move to dedicated Supabase instance
2. 🚀 Implement background job queue (BullMQ + Redis)
3. 🚀 Use OpenAI batch API for non-urgent requests

---

## 📊 **Monitoring Rate Limits**

### **Track Usage:**

```typescript
// lib/monitoring/usage.ts
export async function logUsage(
  service: 'openai' | 'supabase',
  operation: string,
  metadata?: any
) {
  const supabase = await createClient()
  
  await supabase.from('usage_logs').insert({
    service,
    operation,
    metadata,
    timestamp: new Date().toISOString()
  })
}

// Usage
await logUsage('openai', 'generate-campaign', { tokens: 1500 })
```

### **Dashboard Query:**

```sql
-- Check OpenAI usage in last hour
SELECT 
  COUNT(*) as requests,
  SUM((metadata->>'tokens')::int) as total_tokens
FROM usage_logs
WHERE service = 'openai'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

---

## 🔧 **Quick Wins**

1. **Use `gpt-4o-mini` instead of `gpt-4`** - 60x cheaper, 10x faster
2. **Reduce max_tokens** - Only request what you need
3. **Stream responses** - Better UX, same rate limits
4. **Batch database inserts** - Use `.insert([...])` not multiple calls
5. **Add indexes** - Speed up queries, reduce load

---

## 📚 **Resources**

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [Vercel Function Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
- [Upstash Redis](https://upstash.com/)

---

**Bottom Line:** Connection pooling + request queuing + caching = 90% of rate limit problems solved. 🎯
