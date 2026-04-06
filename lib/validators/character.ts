import { z } from 'zod'

export const characterSchema = z.object({
  player_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  name: z.string().min(1, 'Character name is required').max(100, 'Character name must be 100 characters or less'),
  avatar_url: z.string().url().nullable().optional(),
})

export const updateCharacterSchema = z.object({
  name: z.string().min(1, 'Character name is required').max(100, 'Character name must be 100 characters or less').optional(),
  avatar_url: z.string().url().nullable().optional(),
})

export type CharacterInput = z.infer<typeof characterSchema>
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>
