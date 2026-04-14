/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AICampaignGenerator } from '@/components/dm/ai-campaign-generator'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch for SSE streaming
global.fetch = jest.fn()

describe('AICampaignGenerator - Streaming Progress UI', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
  })

  it('renders the enhanced UI with feature badges', () => {
    render(<AICampaignGenerator />)
    
    expect(screen.getByText('AI World Generator')).toBeInTheDocument()
    expect(screen.getByText('2-4 Towns')).toBeInTheDocument()
    expect(screen.getByText('3-5 Shops per Town')).toBeInTheDocument()
    expect(screen.getByText('3-5 Notable People')).toBeInTheDocument()
    expect(screen.getByText('5-10 Items per Shop')).toBeInTheDocument()
  })

  it('shows colored progress boxes during generation', async () => {
    // Mock SSE stream
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: connected\ndata: {}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: entity\ndata: {"type":"campaign","data":{"id":"1","name":"Test Campaign"}}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: entity\ndata: {"type":"town","data":{"id":"2","name":"Test Town"}}\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    })

    render(<AICampaignGenerator />)
    
    const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
    const button = screen.getByRole('button', { name: /Generate Complete World/i })

    fireEvent.change(textarea, { target: { value: 'Test campaign' } })
    fireEvent.click(button)

    // Wait for progress boxes to appear
    await waitFor(() => {
      expect(screen.getByText('Campaign')).toBeInTheDocument()
      expect(screen.getByText('Towns')).toBeInTheDocument()
      expect(screen.getByText('Shops')).toBeInTheDocument()
      expect(screen.getByText('Items')).toBeInTheDocument()
    })

    // Verify campaign entity appears
    await waitFor(() => {
      expect(screen.getByText('Test Campaign')).toBeInTheDocument()
    })

    // Verify town entity appears
    await waitFor(() => {
      expect(screen.getByText('• Test Town')).toBeInTheDocument()
    })
  })

  it('displays notable people in blue chips when created', async () => {
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: connected\ndata: {}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: entity\ndata: {"type":"notable_person","data":{"id":"1","name":"Theron"}}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: entity\ndata: {"type":"notable_person","data":{"id":"2","name":"Lyssa"}}\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    })

    render(<AICampaignGenerator />)
    
    const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
    const button = screen.getByRole('button', { name: /Generate Complete World/i })

    fireEvent.change(textarea, { target: { value: 'Test campaign' } })
    fireEvent.click(button)

    // Wait for notable people section to appear
    await waitFor(() => {
      expect(screen.getByText(/Notable People \(2\)/i)).toBeInTheDocument()
    })

    // Verify people chips are displayed
    expect(screen.getByText('Theron')).toBeInTheDocument()
    expect(screen.getByText('Lyssa')).toBeInTheDocument()
  })

  it('uses the streaming API endpoint', async () => {
    const mockReader = {
      read: jest.fn().mockResolvedValue({ done: true, value: undefined })
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    })

    render(<AICampaignGenerator />)
    
    const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
    const button = screen.getByRole('button', { name: /Generate Complete World/i })

    fireEvent.change(textarea, { target: { value: 'Test campaign' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dm/generate-world',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'Test campaign' })
        })
      )
    })
  })

  it('shows progress bar with percentage', async () => {
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: progress\ndata: {"current":5,"total":15,"message":"Creating towns..."}\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    })

    render(<AICampaignGenerator />)
    
    const textarea = screen.getByPlaceholderText(/dark fantasy campaign/i)
    const button = screen.getByRole('button', { name: /Generate Complete World/i })

    fireEvent.change(textarea, { target: { value: 'Test campaign' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Creating towns...')).toBeInTheDocument()
      expect(screen.getByText('33%')).toBeInTheDocument() // 5/15 = 33%
    })
  })
})
