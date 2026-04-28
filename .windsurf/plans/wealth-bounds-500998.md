# Per-Map Wealth Bounds

Adds DM-configurable floor/ceiling to each map that linearly remaps the raw IDW wealth score before it is stored on `world_towns`, enabling a "poor kingdom" or "rich trading empire" without touching the underlying economic model.

---

## How it works

Raw IDW score (0–1) → `remapped = floor + raw × (ceiling − floor)` → stored as `wealth_score`

| Setting | Floor | Ceiling | Effect |
|---|---|---|---|
| Default (unconstrained) | 0.00 | 1.00 | No change |
| Poor frontier | Poor (0.10) | Modest (0.36) | Best possible = Modest |
| Rich empire | Comfortable (0.36) | Opulent (1.00) | Worst possible = Comfortable |
| Continental | Destitute (0.00) | Opulent (1.00) | Full range |

WealthLabel thresholds: Destitute < 0.10 ≤ Poor < 0.22 ≤ Modest < 0.36 ≤ Comfortable < 0.50 ≤ Wealthy < 0.65 ≤ Prosperous < 0.80 ≤ Opulent

---

## Steps

### 1. DB migration
```sql
ALTER TABLE campaign_maps
  ADD COLUMN wealth_floor   REAL NOT NULL DEFAULT 0.0
    CHECK (wealth_floor  >= 0.0 AND wealth_floor  <= 1.0),
  ADD COLUMN wealth_ceiling REAL NOT NULL DEFAULT 1.0
    CHECK (wealth_ceiling >= 0.0 AND wealth_ceiling <= 1.0);
```

### 2. `remapWealthScore` + `WEALTH_LABEL_THRESHOLDS` — `lib/world/wealthField.ts`
- Add `WEALTH_LABEL_THRESHOLDS: Array<{ label: WealthLabel; value: number }>` export so UI can build dropdowns without hardcoding
- Add `remapWealthScore(raw, floor, ceiling): number` — `floor + raw × (ceiling − floor)`, clamped 0–1

### 3. PATCH route — `app/api/world/map-settings/route.ts`
- Auth + DM ownership check
- Zod: `{ map_id, campaign_id, wealth_floor, wealth_ceiling }`, validate `floor < ceiling`
- Updates `campaign_maps`

### 4. Apply remap in `place-town` route
- Add `wealth_floor, wealth_ceiling` to the existing map `select`
- After `computeWealthScore(scores)` → call `remapWealthScore(raw, floor, ceiling)` → use remapped value for `wealthLabel`, `deriveTownTier`, `estimatePopulation`, and the DB insert

### 5. UI — `resources_placed` step in `map-setup-wizard.tsx`
Add a "World Economy" card above the "Generate Atmosphere" button:
- Two `<select>` dropdowns driven by `WEALTH_LABEL_THRESHOLDS`: **Minimum prosperity** (floor) and **Maximum prosperity** (ceiling)
- Auto-save on change via PATCH (no extra button)
- Note: *"Changing these after towns are placed won't update existing towns."*
- Props: `mapId`, `wealth_floor`, `wealth_ceiling` passed in from page

### 6. Thread props through
- `page.tsx` — add `wealth_floor` + `wealth_ceiling` to map fetch, pass to `MapSetupWizard`
- `MapSetupWizardProps` — add both fields
- `database.types.ts` — add to `campaign_maps` Row / Insert / Update

---

## Out of scope
- Retroactively updating existing town wealth scores when bounds change
- Applying bounds to individual resource dimension scores (only `wealth_score` is remapped)
- Campaign-level shared bounds
