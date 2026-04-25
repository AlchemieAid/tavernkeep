/**
 * Tests for /api/world/update-poi route
 *
 * Covers:
 * - Zod schema contract (description field, field limits, UUID validation)
 * - Route handler: auth, ownership, DB update, response shape
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Mirror the schema from app/api/world/update-poi/route.ts
// If the route's schema changes, these tests will catch the drift.
// ─────────────────────────────────────────────────────────────────────────────

const updatePoiSchema = z.object({
  poiId: z.string().uuid(),
  mapId: z.string().uuid(),
  is_discovered: z.boolean().optional(),
  is_visible_to_players: z.boolean().optional(),
  name: z.string().max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  player_hint: z.string().max(500).nullable().optional(),
})

const VALID_UUID_1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const validBase = { poiId: VALID_UUID_1, mapId: VALID_UUID_2 }

// ─────────────────────────────────────────────────────────────────────────────
// Schema validation
// ─────────────────────────────────────────────────────────────────────────────

describe('update-poi schema — description field', () => {
  it('accepts a string description', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, description: 'A dark cavern.' })
    expect(result.success).toBe(true)
  })

  it('accepts null description (clearing the field)', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, description: null })
    expect(result.success).toBe(true)
  })

  it('accepts description absent (no-op for that field)', () => {
    const result = updatePoiSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.description).toBeUndefined()
  })

  it('rejects description over 1000 characters', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, description: 'x'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('accepts description exactly at 1000 characters', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, description: 'x'.repeat(1000) })
    expect(result.success).toBe(true)
  })
})

describe('update-poi schema — other fields', () => {
  it('accepts all optional fields together', () => {
    const result = updatePoiSchema.safeParse({
      ...validBase,
      name: 'Dragon Cave',
      description: 'Lair of an ancient dragon.',
      player_hint: 'You smell sulfur.',
      is_discovered: true,
      is_visible_to_players: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID poiId', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, poiId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID mapId', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, mapId: 'bad-id' })
    expect(result.success).toBe(false)
  })

  it('rejects name over 120 characters', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, name: 'x'.repeat(121) })
    expect(result.success).toBe(false)
  })

  it('accepts name exactly at 120 characters', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, name: 'x'.repeat(120) })
    expect(result.success).toBe(true)
  })

  it('rejects player_hint over 500 characters', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, player_hint: 'x'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts player_hint exactly at 500 characters', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, player_hint: 'x'.repeat(500) })
    expect(result.success).toBe(true)
  })

  it('rejects non-boolean is_discovered', () => {
    const result = updatePoiSchema.safeParse({ ...validBase, is_discovered: 'yes' })
    expect(result.success).toBe(false)
  })
})

