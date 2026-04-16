/**
 * Campaign Member Validators
 * @description Zod schemas for campaign membership operations
 */

import { z } from 'zod'

/**
 * Schema for creating a new campaign member
 */
export const campaignMemberSchema = z.object({
  /**
   * Unique identifier for the campaign
   */
  campaign_id: z.string().uuid(),
  /**
   * Unique identifier for the player
   */
  player_id: z.string().uuid(),
  /**
   * Unique identifier for the player who invited the member (optional)
   */
  invited_by: z.string().uuid().nullable().optional(),
  /**
   * Whether the member is active (defaults to true)
   */
  is_active: z.boolean().default(true),
})

/**
 * Schema for updating an existing campaign member
 */
export const updateCampaignMemberSchema = z.object({
  is_active: z.boolean().optional(),
  last_active_at: z.string().datetime().optional(),
})

export type CampaignMemberInput = z.infer<typeof campaignMemberSchema>
export type UpdateCampaignMemberInput = z.infer<typeof updateCampaignMemberSchema>
