import { z } from 'zod'

export const playerSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name must be 100 characters or less'),
  avatar_url: z.string().url().nullable().optional(),
})

export const updatePlayerSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name must be 100 characters or less').optional(),
  avatar_url: z.string().url().nullable().optional(),
})

export type PlayerInput = z.infer<typeof playerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
