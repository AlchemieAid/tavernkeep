# TavernKeep Testing Strategy

## Overview
Comprehensive testing plan covering build quality, architecture integrity, and cybersecurity for TavernKeep's D&D shop management platform.

---

## 1. Security Tests (CRITICAL)

### 1.1 Row-Level Security (RLS) Validation
**Priority**: CRITICAL  
**Rationale**: Core security model - prevents unauthorized data access

```typescript
// __tests__/security/rls-policies.test.ts
describe('RLS Policy Enforcement', () => {
  test('DMs can only access their own campaigns', async () => {
    // Attempt to access another DM's campaign
    // Should return 0 rows or 403
  })
  
  test('Players can only see revealed content', async () => {
    // Query hidden towns/shops/people as player
    // Should return only is_revealed=true items
  })
  
  test('Hidden items never reach player API', async () => {
    // Call /api/shops/[slug] as player
    // Verify is_hidden=true items are stripped
  })
  
  test('Players cannot modify DM-owned entities', async () => {
    // Attempt UPDATE/DELETE on campaigns/shops
    // Should fail with permission error
  })
})
```

**Implementation**:
- Use `@supabase/supabase-js` test client with different user contexts
- Create test fixtures for DM and Player users
- Verify RLS policies block unauthorized access

---

### 1.2 API Route Authorization
**Priority**: CRITICAL  
**Rationale**: Prevents privilege escalation and data tampering

```typescript
// __tests__/security/api-auth.test.ts
describe('API Authorization', () => {
  test('DM routes require authentication', async () => {
    const response = await fetch('/api/dm/campaigns', {
      method: 'POST',
      // No auth header
    })
    expect(response.status).toBe(401)
  })
  
  test('DM routes verify ownership before mutations', async () => {
    // Attempt to update another DM's campaign
    const response = await fetch('/api/dm/campaigns/other-dm-id', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer <valid-token>' }
    })
    expect(response.status).toBe(403)
  })
  
  test('Player routes strip hidden content server-side', async () => {
    const response = await fetch('/api/shops/test-slug')
    const data = await response.json()
    expect(data.items.every(i => !i.is_hidden)).toBe(true)
  })
})
```

---

### 1.3 Environment Variable Security
**Priority**: HIGH  
**Rationale**: Prevents API key leaks

```typescript
// __tests__/security/env-vars.test.ts
describe('Environment Variable Security', () => {
  test('OPENAI_API_KEY never exposed to client', async () => {
    // Check all client bundles
    const clientBundle = await getClientBundle()
    expect(clientBundle).not.toContain('OPENAI_API_KEY')
    expect(clientBundle).not.toContain('sk-')
  })
  
  test('Only NEXT_PUBLIC_ vars in client code', () => {
    const clientEnvVars = getClientEnvironmentVariables()
    clientEnvVars.forEach(key => {
      expect(key).toMatch(/^NEXT_PUBLIC_/)
    })
  })
})
```

---

### 1.4 Input Validation & Injection Prevention
**Priority**: HIGH  
**Rationale**: Prevents SQL injection, XSS, and malformed data

```typescript
// __tests__/security/input-validation.test.ts
describe('Input Validation', () => {
  test('Zod schemas reject malformed inputs', () => {
    const maliciousInput = {
      name: '<script>alert("xss")</script>',
      description: "'; DROP TABLE campaigns; --"
    }
    
    const result = CampaignSchema.safeParse(maliciousInput)
    expect(result.success).toBe(false)
  })
  
  test('AI generation rejects inappropriate content', async () => {
    const response = await fetch('/api/dm/generate-campaign', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'offensive content here' })
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { message: expect.stringContaining('inappropriate') }
    })
  })
})
```

---

### 1.5 Rate Limiting
**Priority**: MEDIUM  
**Rationale**: Prevents API abuse and cost overruns

```typescript
// __tests__/security/rate-limiting.test.ts
describe('Rate Limiting', () => {
  test('AI endpoints enforce 5 req/min limit', async () => {
    const requests = Array(6).fill(null).map(() => 
      fetch('/api/dm/generate-campaign', { method: 'POST' })
    )
    
    const responses = await Promise.all(requests)
    const rateLimited = responses.filter(r => r.status === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })
})
```

---

## 2. Architecture Tests

### 2.1 Database Schema Integrity
**Priority**: HIGH  
**Rationale**: Ensures migrations are applied correctly

```typescript
// __tests__/architecture/schema.test.ts
describe('Database Schema', () => {
  test('All tables have RLS enabled', async () => {
    const tables = await supabase.rpc('get_tables_without_rls')
    expect(tables).toHaveLength(0)
  })
  
  test('Foreign key constraints exist', async () => {
    const constraints = await supabase.rpc('get_foreign_keys')
    expect(constraints).toContainEqual({
      table: 'shops',
      column: 'campaign_id',
      references: 'campaigns(id)'
    })
  })
  
  test('Indexes exist on frequently queried columns', async () => {
    const indexes = await supabase.rpc('get_indexes')
    expect(indexes).toContainEqual({
      table: 'items',
      column: 'shop_id'
    })
  })
})
```

---

### 2.2 Type Safety
**Priority**: HIGH  
**Rationale**: Catches type errors before runtime

```typescript
// __tests__/architecture/types.test.ts
describe('Type Safety', () => {
  test('Generated Supabase types match schema', async () => {
    const campaign: Database['public']['Tables']['campaigns']['Row'] = {
      id: 'uuid',
      dm_id: 'uuid',
      name: 'Test',
      // ... all required fields
    }
    
    expect(campaign).toBeDefined()
  })
  
  test('Zod schemas match TypeScript interfaces', () => {
    const campaignData = CampaignSchema.parse({
      name: 'Test Campaign',
      ruleset: '5e'
    })
    
    const typed: Campaign = campaignData
    expect(typed).toBeDefined()
  })
})
```

---

### 2.3 File Structure Conventions
**Priority**: MEDIUM  
**Rationale**: Maintains codebase organization per .windsurfrules

```typescript
// __tests__/architecture/file-structure.test.ts
describe('File Structure', () => {
  test('All prompts in /lib/prompts/', () => {
    const prompts = glob.sync('**/*.ts', { cwd: 'lib/prompts' })
    expect(prompts.length).toBeGreaterThan(0)
    
    // No inline prompt strings in API routes
    const apiRoutes = glob.sync('app/api/**/*.ts')
    apiRoutes.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toMatch(/system.*You are/)
    })
  })
  
  test('All validators in /lib/validators/', () => {
    const validators = glob.sync('lib/validators/**/*.ts')
    expect(validators).toContainEqual('lib/validators/campaign.ts')
  })
  
  test('Components follow naming convention', () => {
    const components = glob.sync('components/**/*.tsx')
    components.forEach(file => {
      expect(path.basename(file)).toMatch(/^[a-z-]+\.tsx$/)
    })
  })
})
```

---

### 2.4 Server/Client Component Separation
**Priority**: MEDIUM  
**Rationale**: Prevents hydration errors and improves performance

```typescript
// __tests__/architecture/component-boundaries.test.ts
describe('Component Boundaries', () => {
  test('Server Components do not use client hooks', () => {
    const serverComponents = getServerComponents()
    serverComponents.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toMatch(/useState|useEffect|useRouter/)
    })
  })
  
  test('Client Components have "use client" directive', () => {
    const clientComponents = getComponentsUsingHooks()
    clientComponents.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).toMatch(/^['"]use client['"]/)
    })
  })
})
```

---

## 3. Build Quality Tests

### 3.1 TypeScript Compilation
**Priority**: CRITICAL  
**Rationale**: Already in CI, but document for completeness

```bash
# In CI workflow
npm run type-check
```

---

### 3.2 ESLint Rules
**Priority**: HIGH  
**Rationale**: Enforces code quality standards

```bash
# In CI workflow
npm run lint
```

---

### 3.3 Build Success
**Priority**: CRITICAL  
**Rationale**: Ensures production build works

```bash
# In CI workflow
npm run build
```

---

### 3.4 Bundle Size Monitoring
**Priority**: MEDIUM  
**Rationale**: Prevents performance regression

```typescript
// __tests__/build/bundle-size.test.ts
describe('Bundle Size', () => {
  test('Client bundle < 300KB gzipped', async () => {
    const stats = await getBuildStats()
    expect(stats.clientBundleSize).toBeLessThan(300 * 1024)
  })
  
  test('No duplicate dependencies', async () => {
    const duplicates = await findDuplicateDependencies()
    expect(duplicates).toHaveLength(0)
  })
})
```

---

## 4. Functional Tests (Key User Flows)

### 4.1 DM Campaign Creation
**Priority**: HIGH  
**Rationale**: Core DM workflow

```typescript
// __tests__/functional/dm-campaign.test.ts
describe('DM Campaign Creation', () => {
  test('DM can create campaign with AI', async () => {
    // Login as DM
    // Navigate to /dm/campaigns/new
    // Fill AI generation form
    // Submit and wait for generation
    // Verify campaign created
    // Verify AI usage tracked
  })
  
  test('DM can create campaign manually', async () => {
    // Similar flow without AI
  })
})
```

---

### 4.2 Player Shop Browsing
**Priority**: HIGH  
**Rationale**: Core player experience

```typescript
// __tests__/functional/player-shop.test.ts
describe('Player Shop Browsing', () => {
  test('Player can view public shop', async () => {
    // Navigate to /shop/[slug]
    // Verify shop details displayed
    // Verify only revealed items shown
    // Verify hidden items not in DOM
  })
  
  test('Player cannot access inactive shop', async () => {
    // Navigate to inactive shop slug
    // Verify 404 or "Shop not available"
  })
})
```

---

### 4.3 AI Generation Cost Tracking
**Priority**: MEDIUM  
**Rationale**: Prevents unexpected costs

```typescript
// __tests__/functional/ai-cost-tracking.test.ts
describe('AI Cost Tracking', () => {
  test('AI usage is recorded', async () => {
    const before = await getAIUsageCount()
    await generateCampaign()
    const after = await getAIUsageCount()
    expect(after).toBe(before + 1)
  })
  
  test('Cost is displayed to DM', async () => {
    const response = await generateCampaign()
    expect(response.data.usage.estimatedCost).toBeDefined()
  })
})
```

---

## 5. Integration Tests

### 5.1 Supabase Realtime
**Priority**: MEDIUM (if implemented)  
**Rationale**: Ensures live updates work

```typescript
// __tests__/integration/realtime.test.ts
describe('Realtime Updates', () => {
  test('Player sees shop updates in real-time', async () => {
    // DM updates shop
    // Player subscribed to shop
    // Verify player receives update within 1s
  })
})
```

---

### 5.2 OpenAI API Integration
**Priority**: MEDIUM  
**Rationale**: Ensures AI generation works

```typescript
// __tests__/integration/openai.test.ts
describe('OpenAI Integration', () => {
  test('Campaign generation returns valid JSON', async () => {
    const result = await generateCampaign({ prompt: 'Test' })
    expect(result.data.campaign).toMatchObject({
      name: expect.any(String),
      description: expect.any(String)
    })
  })
  
  test('Content moderation flags inappropriate content', async () => {
    const result = await generateCampaign({ prompt: 'offensive' })
    expect(result.error).toBeDefined()
  })
})
```

---

## 6. Performance Tests

### 6.1 API Response Times
**Priority**: MEDIUM  
**Rationale**: Ensures good UX

```typescript
// __tests__/performance/api-response.test.ts
describe('API Performance', () => {
  test('Shop list loads < 500ms', async () => {
    const start = Date.now()
    await fetch('/api/dm/shops?campaign_id=test')
    const duration = Date.now() - start
    expect(duration).toBeLessThan(500)
  })
})
```

---

### 6.2 Database Query Optimization
**Priority**: MEDIUM  
**Rationale**: Prevents N+1 queries

```typescript
// __tests__/performance/db-queries.test.ts
describe('Database Queries', () => {
  test('Shop list uses single query with joins', async () => {
    const queryLog = []
    // Monitor Supabase queries
    await getShopsWithItems()
    expect(queryLog.length).toBe(1) // Single query with join
  })
})
```

---

## 7. Accessibility Tests

### 7.1 ARIA Labels
**Priority**: LOW  
**Rationale**: Improves accessibility

```typescript
// __tests__/accessibility/aria.test.ts
describe('Accessibility', () => {
  test('All interactive elements have labels', () => {
    const buttons = document.querySelectorAll('button')
    buttons.forEach(btn => {
      expect(
        btn.getAttribute('aria-label') || btn.textContent
      ).toBeTruthy()
    })
  })
})
```

---

## Implementation Plan

### Phase 1: Security Tests (Week 1)
1. Set up testing framework (Jest + React Testing Library)
2. Implement RLS policy tests
3. Implement API authorization tests
4. Implement environment variable security tests

### Phase 2: Architecture Tests (Week 1-2)
5. Implement schema integrity tests
6. Implement type safety tests
7. Implement file structure tests

### Phase 3: Build Quality (Week 2)
8. Add bundle size monitoring
9. Configure CI to run all tests
10. Set up test coverage reporting

### Phase 4: Functional Tests (Week 3)
11. Implement key user flow tests
12. Add integration tests for AI generation

### Phase 5: Performance & Accessibility (Week 4)
13. Add performance benchmarks
14. Add basic accessibility tests

---

## Testing Tools

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@types/jest": "^29.5.0",
    "msw": "^2.0.0",
    "playwright": "^1.40.0"
  }
}
```

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:security
      
  architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:architecture
      
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run build
      - run: npm run test:functional
```

---

## Success Metrics

- **Security**: 100% of RLS policies tested, 0 API key leaks
- **Architecture**: 100% type coverage, 0 TypeScript errors
- **Build**: CI passes on every commit
- **Functional**: Core user flows covered
- **Performance**: API responses < 500ms p95

---

## Maintenance

- Run security tests before every deployment
- Run full test suite on every PR
- Review and update tests when adding new features
- Monitor test coverage (target: 80%+ for critical paths)
