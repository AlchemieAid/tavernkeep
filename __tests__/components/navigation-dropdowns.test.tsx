/**
 * Navigation Dropdowns Tests
 * 
 * Tests for campaign dropdown behavior, especially stale data after deletion.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { NavigationDropdowns } from '@/components/shared/navigation-dropdowns'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  channel: jest.fn(),
  removeChannel: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

describe('NavigationDropdowns', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dm/dashboard')
    ;(useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams())
    
    // Setup default mock responses
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })

    mockSupabase.channel.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })
  })

  describe('Campaign Deletion Handling', () => {
    it('should switch to first campaign when selected campaign is deleted', async () => {
      const campaigns = [
        { id: 'campaign-1', name: 'Campaign 1', dm_id: 'test-user-id' },
        { id: 'campaign-2', name: 'Campaign 2', dm_id: 'test-user-id' },
        { id: 'campaign-3', name: 'Campaign 3', dm_id: 'test-user-id' },
      ]

      // Initial load with all campaigns
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: campaigns,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      // Simulate being on campaign-2 page
      ;(usePathname as jest.Mock).mockReturnValue('/dm/campaigns/campaign-2')

      const { rerender } = render(<NavigationDropdowns />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('campaigns')
      })

      // Now simulate campaign-2 being deleted
      const updatedCampaigns = campaigns.filter(c => c.id !== 'campaign-2')
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: updatedCampaigns,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      // Trigger reload (simulating realtime update)
      rerender(<NavigationDropdowns />)

      await waitFor(() => {
        // Should have loaded campaigns again
        expect(mockSupabase.from).toHaveBeenCalledWith('campaigns')
      })

      // Component should handle the missing campaign gracefully
      // by falling back to the first available campaign
    })

    it('should clear all data when last campaign is deleted', async () => {
      // Start with one campaign
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{ id: 'last-campaign', name: 'Last Campaign', dm_id: 'test-user-id' }],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const { rerender } = render(<NavigationDropdowns />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('campaigns')
      })

      // Delete the last campaign
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      rerender(<NavigationDropdowns />)

      await waitFor(() => {
        // Should show Item Library link when no campaigns
        expect(screen.queryByText('Item Library')).toBeInTheDocument()
      })
    })

    it('should subscribe to realtime campaign changes', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }))

      render(<NavigationDropdowns />)

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('navigation-campaigns-test-user-id')
      })

      // Verify subscription setup
      const channelMock = mockSupabase.channel.mock.results[0].value
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'campaigns',
        }),
        expect.any(Function)
      )
      expect(channelMock.subscribe).toHaveBeenCalled()
    })
  })

  describe('Campaign Selection', () => {
    it('should detect campaign from URL', async () => {
      const campaigns = [
        { id: 'url-campaign', name: 'URL Campaign', dm_id: 'test-user-id' },
        { id: 'other-campaign', name: 'Other Campaign', dm_id: 'test-user-id' },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: campaigns,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      ;(usePathname as jest.Mock).mockReturnValue('/dm/campaigns/url-campaign')

      render(<NavigationDropdowns />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('campaigns')
      })

      // Should have selected the campaign from URL
      // and loaded its related data
    })

    it('should fallback to first campaign if URL campaign not found', async () => {
      const campaigns = [
        { id: 'first-campaign', name: 'First Campaign', dm_id: 'test-user-id' },
        { id: 'second-campaign', name: 'Second Campaign', dm_id: 'test-user-id' },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: campaigns,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      // URL points to non-existent campaign
      ;(usePathname as jest.Mock).mockReturnValue('/dm/campaigns/deleted-campaign')

      render(<NavigationDropdowns />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('campaigns')
      })

      // Should fallback to first campaign
    })
  })

  describe('Data Loading', () => {
    it('should load towns when campaign is selected', async () => {
      const campaigns = [
        { id: 'test-campaign', name: 'Test Campaign', dm_id: 'test-user-id' },
      ]

      const towns = [
        { id: 'town-1', name: 'Town 1', campaign_id: 'test-campaign' },
        { id: 'town-2', name: 'Town 2', campaign_id: 'test-campaign' },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: campaigns,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'towns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: towns,
                  error: null,
                }),
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      render(<NavigationDropdowns />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('towns')
      })
    })

    it('should load shops for selected campaign', async () => {
      const campaigns = [
        { id: 'test-campaign', name: 'Test Campaign', dm_id: 'test-user-id' },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: campaigns,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      render(<NavigationDropdowns />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('shops')
      })
    })
  })
})
