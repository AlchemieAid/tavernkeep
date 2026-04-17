# AI Generation Architecture - Unified Cascading System

## Problem Statement

Currently, TavernKeep has **two different generation systems**:

1. **Full Campaign Generator** - Uses orchestrator, generates entire hierarchy
2. **Individual Generators** - Standalone, only generate their own level

This creates inconsistency where:
- Generating a campaign creates towns → shops → people → items
- Generating a town only creates the town + people (no shops/items)
- Generating a shop only creates the shop + items
- No cascading from mid-hierarchy entry points

## Solution: Unified Cascading Generation

**Every generator should cascade down the hierarchy using the same orchestrator logic.**

### Hierarchy

```
1. Campaign
   ↓
2. Town (2-4 per campaign)
   ↓
3. Shops (3-5 per town) + Notable People (3-5 per town)
   ↓
4. Items (5-10 per shop)
```

### Generation Entry Points

| Entry Point | Generates | API Endpoint |
|-------------|-----------|--------------|
| Campaign | Campaign → Towns → Shops → People → Items | `/api/dm/generate-hierarchy` (exists) |
| Town | Town → Shops → People → Items | `/api/dm/generate-hierarchy` (add `startLevel: 'town'`) |
| Shop | Shop → Items | `/api/dm/generate-shop` (update to use orchestrator) |
| Notable Person | Notable Person only | `/api/dm/generate-notable-person` (no cascade) |
| Items | Items only | `/api/dm/generate-items` (no cascade) |

### Implementation Plan

#### Phase 1: Extend Orchestrator for Mid-Hierarchy Entry

Update `/lib/generation/orchestrator.ts` to support:
- `startLevel`: 'campaign' | 'town' | 'shop'
- `parentId`: ID of parent entity (campaignId for town, townId for shop)
- `generateCount`: How many entities to generate at start level

```typescript
interface GenerationConfig {
  startLevel: 'campaign' | 'town' | 'shop'
  parentId?: string  // campaignId or townId
  prompt: string
  generateCount?: number  // How many towns/shops to generate
  
  // Existing config...
  campaign: { townCount: [2, 4] }
  town: { shopCount: [3, 5], notablePeopleCount: [3, 5] }
  shop: { itemCount: [5, 10], autoGenerateItems: boolean }
}
```

#### Phase 2: Update API Routes

**`/api/dm/generate-town/route.ts`**
- Change from standalone generation to orchestrator-based
- Call orchestrator with `startLevel: 'town'`, `parentId: campaignId`
- Generates: Town → Shops → People → Items

**`/api/dm/generate-shop/route.ts`**
- Change from standalone generation to orchestrator-based  
- Call orchestrator with `startLevel: 'shop'`, `parentId: townId`
- Generates: Shop → Items

**`/api/dm/generate-notable-person/route.ts`**
- Keep as-is (no cascade needed)

**`/api/dm/generate-items/route.ts`**
- Keep as-is (no cascade needed)

#### Phase 3: Update UI Components

**`components/dm/ai-town-generator.tsx`**
- Update progress steps to show: Town → Shops → People → Items
- Display counts of generated entities

**`components/dm/ai-shop-generator.tsx`**
- Update progress steps to show: Shop → Items
- Display item count

#### Phase 4: Configuration Options

Add UI controls to let DMs customize generation:
- "Generate shops for this town?" (checkbox, default: true)
- "Number of shops" (slider, 3-5)
- "Generate items for shops?" (checkbox, default: true)

---

## Benefits

✅ **Consistency** - Same generation logic everywhere
✅ **Flexibility** - Start at any hierarchy level
✅ **Predictability** - DMs know what to expect
✅ **Efficiency** - Reuse orchestrator code
✅ **Maintainability** - Single source of truth

---

## Migration Path

1. ✅ Document current architecture
2. ⏳ Extend orchestrator for mid-hierarchy entry
3. ⏳ Update `/api/dm/generate-town` to use orchestrator
4. ⏳ Update `/api/dm/generate-shop` to use orchestrator
5. ⏳ Update UI components with new progress steps
6. ⏳ Test all entry points
7. ⏳ Add configuration options (optional enhancement)

---

## Example Flows

### Flow 1: Generate Campaign
```
User: "A dark fantasy campaign"
→ Campaign created
→ 3 towns generated
→ 4 shops per town (12 total)
→ 4 people per town (12 total)
→ 7 items per shop (84 total)
```

### Flow 2: Add Town to Existing Campaign
```
User: "A coastal trading port" (in existing campaign)
→ Town created
→ 4 shops generated
→ 4 people generated
→ 7 items per shop (28 total)
```

### Flow 3: Add Shop to Existing Town
```
User: "A mysterious apothecary" (in existing town)
→ Shop created
→ Shopkeeper (notable person) created
→ 8 items generated
```

### Flow 4: Add Notable Person (No Cascade)
```
User: "A corrupt guard captain"
→ Notable person created
→ No cascade
```

### Flow 5: Add Items (No Cascade)
```
User: "Rare magical weapons"
→ 5 items created
→ No cascade
```
