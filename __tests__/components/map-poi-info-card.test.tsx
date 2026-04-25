/**
 * Tests for MapPoIInfoCard component
 *
 * Covers:
 * - Rendering POI name/description/hint
 * - Pencil button toggles edit mode
 * - Edit form pre-fills from current POI values
 * - Save calls update-poi API with correct body (including description)
 * - Cancel closes form without calling fetch
 * - onUpdated callback invoked after successful save
 * - Auto-generated nudge shows for POIs with no name/description/hint
 * - "add details" link opens edit form
 * - Discovered / visible toggles call API with correct field
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapPoIInfoCard } from '@/components/dm/map-poi-info-card'

jest.mock('@/lib/world/poiDefinitions', () => ({
  POI_DEFINITIONS: [
    {
      type: 'dungeon',
      label: 'Dungeon',
      icon: '🏚️',
      category: 'danger',
      color: '#c0392b',
      description: 'A dangerous underground location.',
      modifiers: {},
    },
  ],
}))

// ─────────────────────────────────────────────────────────────────────────────
// Fixture helpers
// ─────────────────────────────────────────────────────────────────────────────

const basePoi = {
  id: 'poi-aaaaaaaa-0000-0000-0000-000000000001',
  x_pct: 0.5,
  y_pct: 0.5,
  poi_type: 'dungeon',
  poi_category: 'danger',
  name: 'Dragon Cave',
  is_discovered: false,
  is_visible_to_players: false,
  player_hint: null,
  description: null,
}

const defaultProps = {
  poi: basePoi,
  mapId: 'map-bbbbbbbb-0000-0000-0000-000000000002',
  x: 200,
  y: 150,
  containerWidth: 1000,
  containerHeight: 700,
  onClose: jest.fn(),
  onUpdated: jest.fn(),
  onDeleted: jest.fn(),
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('MapPoIInfoCard — rendering', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the POI name in the header', () => {
    render(<MapPoIInfoCard {...defaultProps} />)
    expect(screen.getByText('Dragon Cave')).toBeInTheDocument()
  })

  it('renders the POI type label', () => {
    render(<MapPoIInfoCard {...defaultProps} />)
    expect(screen.getByText(/dungeon/i)).toBeInTheDocument()
  })

  it('shows description text when POI has one', () => {
    render(<MapPoIInfoCard {...defaultProps} poi={{ ...basePoi, description: 'A fearsome lair.' }} />)
    expect(screen.getByText('A fearsome lair.')).toBeInTheDocument()
  })

  it('shows player_hint text when POI has one', () => {
    render(<MapPoIInfoCard {...defaultProps} poi={{ ...basePoi, player_hint: 'You smell sulfur.' }} />)
    expect(screen.getByText(/you smell sulfur/i)).toBeInTheDocument()
  })

  it('shows discovered toggle defaulting to "No"', () => {
    render(<MapPoIInfoCard {...defaultProps} />)
    expect(screen.getByText('Party discovered')).toBeInTheDocument()
    const discoveredBtn = screen.getByText('Party discovered').closest('button')
    expect(discoveredBtn).toHaveTextContent('No')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Auto-generated nudge
// ─────────────────────────────────────────────────────────────────────────────

describe('MapPoIInfoCard — auto-generated nudge', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows nudge when POI has no name, description, or hint', () => {
    render(<MapPoIInfoCard {...defaultProps} poi={{ ...basePoi, name: null, description: null, player_hint: null }} />)
    expect(screen.getByText(/auto-generated/i)).toBeInTheDocument()
    expect(screen.getByText(/add details/i)).toBeInTheDocument()
  })

  it('does NOT show nudge when POI has a name', () => {
    render(<MapPoIInfoCard {...defaultProps} />)
    expect(screen.queryByText(/auto-generated/i)).not.toBeInTheDocument()
  })

  it('does NOT show nudge when POI has only a description', () => {
    render(<MapPoIInfoCard {...defaultProps} poi={{ ...basePoi, name: null, description: 'Something here.', player_hint: null }} />)
    expect(screen.queryByText(/auto-generated/i)).not.toBeInTheDocument()
  })

  it('"add details" link opens edit form', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} poi={{ ...basePoi, name: null, description: null, player_hint: null }} />)

    await user.click(screen.getByText(/add details/i))

    expect(screen.getByPlaceholderText(/what the DM knows/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Edit mode
// ─────────────────────────────────────────────────────────────────────────────

describe('MapPoIInfoCard — edit mode', () => {
  beforeEach(() => jest.clearAllMocks())

  it('pencil button is present', () => {
    render(<MapPoIInfoCard {...defaultProps} />)
    expect(screen.getByTitle('Edit details')).toBeInTheDocument()
  })

  it('clicking pencil shows the edit form', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))

    expect(screen.getByPlaceholderText(/what the DM knows/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('edit form pre-fills name from current poi.name', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))

    expect(screen.getByDisplayValue('Dragon Cave')).toBeInTheDocument()
  })

  it('edit form pre-fills description from current poi.description', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} poi={{ ...basePoi, description: 'Existing desc.' }} />)

    await user.click(screen.getByTitle('Edit details'))

    expect(screen.getByDisplayValue('Existing desc.')).toBeInTheDocument()
  })

  it('edit form pre-fills player_hint from current poi.player_hint', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} poi={{ ...basePoi, player_hint: 'Smell sulfur.' }} />)

    await user.click(screen.getByTitle('Edit details'))

    expect(screen.getByDisplayValue('Smell sulfur.')).toBeInTheDocument()
  })

  it('clicking Cancel closes edit form without calling fetch', async () => {
    const user = userEvent.setup()
    const fetchSpy = jest.spyOn(global, 'fetch')
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))
    expect(screen.getByPlaceholderText(/what the DM knows/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByPlaceholderText(/what the DM knows/i)).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('clicking pencil again closes edit form (toggle)', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))
    expect(screen.getByPlaceholderText(/what the DM knows/i)).toBeInTheDocument()

    await user.click(screen.getByTitle('Edit details'))
    expect(screen.queryByPlaceholderText(/what the DM knows/i)).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Save behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('MapPoIInfoCard — save', () => {
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: {}, error: null }),
    } as Response)
  })

  afterEach(() => fetchSpy.mockRestore())

  it('calls update-poi PATCH with poiId and mapId', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/world/update-poi',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.poiId).toBe(basePoi.id)
    expect(body.mapId).toBe(defaultProps.mapId)
  })

  it('sends description field in PATCH body', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))
    const descField = screen.getByPlaceholderText(/what the DM knows/i)
    await user.clear(descField)
    await user.type(descField, 'New description text')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.description).toBe('New description text')
  })

  it('sends null description when field is empty', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))
    const descField = screen.getByPlaceholderText(/what the DM knows/i)
    await user.clear(descField)

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.description).toBeNull()
  })

  it('calls onUpdated with the patch after successful save', async () => {
    const onUpdated = jest.fn()
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} onUpdated={onUpdated} />)

    await user.click(screen.getByTitle('Edit details'))
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalledWith(
        basePoi.id,
        expect.objectContaining({ name: 'Dragon Cave' }),
      )
    })
  })

  it('closes edit form after successful save', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByTitle('Edit details'))
    expect(screen.getByPlaceholderText(/what the DM knows/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/what the DM knows/i)).not.toBeInTheDocument()
    })
  })

  it('does NOT call onUpdated when save request fails', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, json: async () => ({ data: null, error: { message: 'DB error' } }) } as Response)
    const onUpdated = jest.fn()
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} onUpdated={onUpdated} />)

    await user.click(screen.getByTitle('Edit details'))
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(onUpdated).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Discovered / visible toggles
// ─────────────────────────────────────────────────────────────────────────────

describe('MapPoIInfoCard — discovered/visible toggles', () => {
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: {}, error: null }),
    } as Response)
  })

  afterEach(() => fetchSpy.mockRestore())

  it('clicking discovered toggle calls update-poi with is_discovered: true', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByText('Party discovered').closest('button')!)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.is_discovered).toBe(true)
  })

  it('clicking visible toggle calls update-poi with is_visible_to_players: true', async () => {
    const user = userEvent.setup()
    render(<MapPoIInfoCard {...defaultProps} />)

    await user.click(screen.getByText('Visible on player map').closest('button')!)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.is_visible_to_players).toBe(true)
  })
})
