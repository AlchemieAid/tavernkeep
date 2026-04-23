/**
 * E2E Test: AI Campaign Generator Progress
 * 
 * These tests require a real browser environment for SSE streaming.
 * Run with: npx playwright test or in browser with proper streaming support.
 * 
 * NOTE: These were moved from __tests__/components/ because Jest/jsdom
 * cannot properly handle ReadableStream/SSE mocking.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AICampaignGenerator } from '@/components/dm/ai-campaign-generator'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('AICampaignGenerator Progress Display', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Mock fetch for SSE
    global.fetch = jest.fn()
  })

  describe('Progress Bar', () => {
    it('should start at 0%', () => {
      render(<AICampaignGenerator />)
      
      // Progress bar should not be visible initially
      expect(screen.queryByText(/0%/)).not.toBeInTheDocument()
    })

    it('should display percentage correctly', async () => {
      // Mock SSE stream
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {"message":"Started"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: progress\ndata: {"current":1,"total":100,"message":"Rate limit check"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: progress\ndata: {"current":50,"total":100,"message":"Halfway there"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/1%/)).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(/50%/)).toBeInTheDocument()
      })
    })

    it('should reach 100% at completion', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: progress\ndata: {"current":100,"total":100,"message":"Complete"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: complete\ndata: {"results":{"campaign":{"id":"test"}}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument()
      })
    })

    it('should never show more than 100%', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: progress\ndata: {"current":150,"total":100}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        // Should cap at 100%
        const percentageText = screen.queryByText(/\d+%/)
        if (percentageText) {
          const match = percentageText.textContent?.match(/(\d+)%/)
          if (match) {
            const percentage = parseInt(match[1])
            expect(percentage).toBeLessThanOrEqual(100)
          }
        }
      })
    })
  })

  describe('Town Indicator', () => {
    it('should show town names as they are created', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"town-1","name":"Riverdale"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"town-2","name":"Mountainview"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Riverdale')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('Mountainview')).toBeInTheDocument()
      })
    })

    it('should display town count', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"t1","name":"Town 1"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"t2","name":"Town 2"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"t3","name":"Town 3"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Towns \(3\)/)).toBeInTheDocument()
      })
    })

    it('should show latest 2 towns when more than 2 exist', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"t1","name":"Town 1"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"t2","name":"Town 2"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"t3","name":"Town 3"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        // Should show last 2 towns
        expect(screen.getByText('Town 2')).toBeInTheDocument()
        expect(screen.getByText('Town 3')).toBeInTheDocument()
        // Should show "+1 more" indicator
        expect(screen.getByText('+1 more')).toBeInTheDocument()
      })
    })

    it('should not show stars or bullets, only town names', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"t1","name":"Starfall"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        const townName = screen.getByText('Starfall')
        expect(townName).toBeInTheDocument()
        // Should not have bullet point or star before it
        expect(townName.textContent).toBe('Starfall')
        expect(townName.textContent).not.toContain('•')
        expect(townName.textContent).not.toContain('★')
      })
    })
  })

  describe('Shop Indicator', () => {
    it('should show shop names as they are created', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"shop","data":{"id":"s1","name":"The Rusty Sword"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"shop","data":{"id":"s2","name":"Mystic Emporium"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('The Rusty Sword')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('Mystic Emporium')).toBeInTheDocument()
      })
    })
  })

  describe('Campaign Indicator', () => {
    it('should show campaign name when created', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: connected\ndata: {}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: entity\ndata: {"type":"campaign","data":{"id":"c1","name":"Dark Fantasy World"}}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Dark Fantasy World')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message on failure', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('event: error\ndata: {"message":"Generation failed"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      })

      render(<AICampaignGenerator />)

      const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
      fireEvent.change(textarea, { target: { value: 'Test campaign' } })

      const button = screen.getByRole('button', { name: /generate complete world/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Generation Failed/i)).toBeInTheDocument()
        expect(screen.getByText(/Generation failed/i)).toBeInTheDocument()
      })
    })
  })
})
