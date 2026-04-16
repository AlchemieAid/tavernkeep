/**
 * Player Validators
 * @description Zod schemas for player profile data
 */

import { z } from 'zod'

/**
 * Player schema
 * @description Zod schema for player profile data
 */
export const playerSchema = z.object({
  /**
   * User ID
   * @description Unique identifier for the user
   */
  user_id: z.string().uuid(),
  /**
   * Display name
   * @description The player's display name
   */
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name must be 100 characters or less'),
  /**
   * Avatar URL
   * @description The URL of the player's avatar
   */
  avatar_url: z.string().url().nullable().optional(),
})

/**
 * Update player schema
 * @description Zod schema for updating player profile data
 */
export const updatePlayerSchema = z.object({
  /**
   * Display name
   * @description The player's display name
   */
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name must be 100 characters or less').optional(),
  avatar_url: z.string().url().nullable().optional(),
})

export type PlayerInput = z.infer<typeof playerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
