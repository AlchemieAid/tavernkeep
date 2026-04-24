/**
 * Supabase Admin Client Tests
 *
 * Verifies guard rails around the service-role client. We do NOT make
 * real network calls here.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

const ORIGINAL_ENV = { ...process.env }

describe('lib/admin/supabase-admin', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    const mod = await import('@/lib/admin/supabase-admin')
    expect(() => mod.createAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc_role_key'
    const mod = await import('@/lib/admin/supabase-admin')
    expect(() => mod.createAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('reports configuration status correctly', async () => {
    const mod = await import('@/lib/admin/supabase-admin')

    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(mod.isAdminClientConfigured()).toBe(false)

    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc_role_key'
    expect(mod.isAdminClientConfigured()).toBe(true)
  })

  it('returns the same client instance on repeated calls', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc_role_key'
    const mod = await import('@/lib/admin/supabase-admin')
    const a = mod.createAdminClient()
    const b = mod.createAdminClient()
    expect(a).toBe(b)
  })
})
