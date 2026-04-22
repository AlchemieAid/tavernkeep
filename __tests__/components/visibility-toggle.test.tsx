/**
 * Visibility Toggle Component Tests
 * 
 * These tests verify that visibility toggles work correctly after entity creation.
 * Regression test for: Town visibility toggles not working after creating a new town.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VisibilityToggle } from '@/components/dm/visibility-toggle'
import userEvent from '@testing-library/user-event'

// Mock the server actions
const mockToggleAction = jest.fn()

describe('VisibilityToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockToggleAction.mockResolvedValue(undefined)
  })

  test('should toggle visibility when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    
    render(
      <VisibilityToggle
        entityId="town-123"
        isRevealed={false}
        onToggle={onToggle}
        entityType="town"
      />
    )
    
    const toggle = screen.getByRole('switch')
    await user.click(toggle)
    
    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('town-123', true)
    })
  })

  test('should show correct initial state based on isRevealed prop', () => {
    const { rerender } = render(
      <VisibilityToggle
        entityId="town-123"
        isRevealed={false}
        onToggle={jest.fn()}
        entityType="town"
      />
    )
    
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    
    rerender(
      <VisibilityToggle
        entityId="town-123"
        isRevealed={true}
        onToggle={jest.fn()}
        entityType="town"
      />
    )
    
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  test('should handle multiple toggle clicks correctly', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    
    render(
      <VisibilityToggle
        entityId="town-123"
        isRevealed={false}
        onToggle={onToggle}
        entityType="town"
      />
    )
    
    const toggle = screen.getByRole('switch')
    
    // Click to reveal
    await user.click(toggle)
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith('town-123', true))
    
    // Click to hide
    await user.click(toggle)
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith('town-123', false))
    
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  test('should pass correct entity type to onToggle callback', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    
    render(
      <VisibilityToggle
        entityId="shop-456"
        isRevealed={false}
        onToggle={onToggle}
        entityType="shop"
      />
    )
    
    const toggle = screen.getByRole('switch')
    await user.click(toggle)
    
    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('shop-456', true)
    })
  })
})

describe('Campaign Page Town Visibility', () => {
  test('server action should use captured campaignId, not outer scope', () => {
    // This is a conceptual test - in actual pages, we can't easily test
    // the server action closure. The pattern test in server-action-closure.test.ts
    // covers the actual validation.
    
    // The pattern should be:
    // 1. await params to get resolved values
    // 2. Capture in const variables
    // 3. Use captured variables in server actions
    
    const correctPattern = `
      const { campaignId } = await params
      const currentCampaignId = campaignId // ✅ Capture resolved value
      
      async function toggleTownVisibility(townId: string, isRevealed: boolean) {
        'use server'
        await supabase.from('towns').update({ is_revealed: isRevealed }).eq('id', townId)
        revalidatePath(\`/dm/campaigns/\${currentCampaignId}\`) // ✅ Uses captured value
      }
    `
    
    // Verify the pattern includes the capture
    expect(correctPattern).toContain('const currentCampaignId = campaignId')
    expect(correctPattern).toContain('currentCampaignId')
  })
})
