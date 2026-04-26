/**
 * Admin Auth Tests
 *
 * Verifies that checkAdminStatus and requireAdmin behave correctly for all
 * role/active combinations. Critically tests that super_admin access is NOT
 * blocked when is_active is false (application code denies it) and that the
 * service-role client is used so RLS policy changes can never trap an admin.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockMaybySingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    })
  ),
}))

jest.mock('@/lib/admin/supabase-admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupAdminDbRow(row: Record<string, unknown> | null, error: unknown = null) {
  ;(mockMaybySingle as any).mockResolvedValue({ data: row, error })
  ;(mockEq as any).mockReturnValue({ eq: mockEq, maybeSingle: mockMaybySingle })
  ;(mockSelect as any).mockReturnValue({ eq: mockEq })
  ;(mockFrom as any).mockReturnValue({ select: mockSelect })
}

function setupAuthUser(id: string | null) {
  ;(mockGetUser as any).mockResolvedValue({
    data: { user: id ? { id } : null },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkAdminStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('returns null when there is no authenticated user', async () => {
    setupAuthUser(null)
    setupAdminDbRow(null)
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    const result = await checkAdminStatus()
    expect(result).toBeNull()
  })

  it('returns null when user has no admin_users row', async () => {
    setupAuthUser('user-123')
    setupAdminDbRow(null)
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    const result = await checkAdminStatus()
    expect(result).toBeNull()
  })

  it('returns null when is_active = false (application-level block)', async () => {
    setupAuthUser('user-123')
    setupAdminDbRow({
      user_id: 'user-123',
      role: 'super_admin',
      is_active: false,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: null,
    })
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    const result = await checkAdminStatus()
    // Must be blocked at the application level, not by RLS (service-role client
    // reads the row regardless, then app code checks is_active).
    expect(result).toBeNull()
  })

  it('grants access to super_admin with is_active = true', async () => {
    setupAuthUser('user-123')
    setupAdminDbRow({
      user_id: 'user-123',
      role: 'super_admin',
      is_active: true,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: null,
    })
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    const result = await checkAdminStatus()
    expect(result).not.toBeNull()
    expect(result?.role).toBe('super_admin')
    expect(result?.isActive).toBe(true)
  })

  it('super_admin passes any requiredRole check', async () => {
    setupAuthUser('user-123')
    setupAdminDbRow({
      user_id: 'user-123',
      role: 'super_admin',
      is_active: true,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: null,
    })
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    expect(await checkAdminStatus('config_admin')).not.toBeNull()
    expect(await checkAdminStatus('data_admin')).not.toBeNull()
    expect(await checkAdminStatus('super_admin')).not.toBeNull()
  })

  it('config_admin passes when no role or matching role is required', async () => {
    setupAuthUser('user-456')
    setupAdminDbRow({
      user_id: 'user-456',
      role: 'config_admin',
      is_active: true,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: 'admin',
    })
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    expect(await checkAdminStatus()).not.toBeNull()
    expect(await checkAdminStatus('config_admin')).not.toBeNull()
  })

  it('config_admin is denied when super_admin role is required', async () => {
    setupAuthUser('user-456')
    setupAdminDbRow({
      user_id: 'user-456',
      role: 'config_admin',
      is_active: true,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: 'admin',
    })
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    const result = await checkAdminStatus('super_admin')
    expect(result).toBeNull()
  })

  it('uses the service-role (admin) client for admin_users lookup, not the normal client', async () => {
    setupAuthUser('user-123')
    setupAdminDbRow({
      user_id: 'user-123',
      role: 'super_admin',
      is_active: true,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: null,
    })
    const { createAdminClient } = await import('@/lib/admin/supabase-admin')
    const { checkAdminStatus } = await import('@/lib/admin/auth')
    await checkAdminStatus()
    // The service-role client must have been used for the admin_users query.
    expect(createAdminClient).toHaveBeenCalled()
    // The admin client's from() must have been called with admin_users.
    expect(mockFrom).toHaveBeenCalledWith('admin_users')
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('redirects to /login when not authenticated', async () => {
    setupAuthUser(null)
    setupAdminDbRow(null)
    const { requireAdmin } = await import('@/lib/admin/auth')
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/login?redirect=/admin')
  })

  it('redirects to /unauthorized when user is not an admin', async () => {
    setupAuthUser('user-999')
    setupAdminDbRow(null)
    const { requireAdmin } = await import('@/lib/admin/auth')
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/unauthorized')
  })

  it('redirects to /unauthorized when is_active = false', async () => {
    setupAuthUser('user-123')
    setupAdminDbRow({
      user_id: 'user-123',
      role: 'super_admin',
      is_active: false,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: null,
    })
    const { requireAdmin } = await import('@/lib/admin/auth')
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/unauthorized')
  })

  it('returns AdminStatus for an active super_admin', async () => {
    setupAuthUser('user-123')
    setupAdminDbRow({
      user_id: 'user-123',
      role: 'super_admin',
      is_active: true,
      granted_at: '2026-01-01T00:00:00Z',
      granted_by: null,
    })
    const { requireAdmin } = await import('@/lib/admin/auth')
    const result = await requireAdmin()
    expect(result.role).toBe('super_admin')
    expect(result.isActive).toBe(true)
  })
})
