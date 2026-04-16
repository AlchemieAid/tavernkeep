/**
 * Town Validators
 * @description Zod schemas for town creation and updates
 */

import { z } from 'zod'
import { FIELD_LIMITS } from '@/lib/constants/field-limits'

const townSizeEnum = z.enum(['hamlet', 'village', 'town', 'city', 'metropolis'])
const geographicLocationEnum = z.enum([
  'desert', 'forest', 'wilderness', 'necropolis', 'arctic', 
  'plains', 'riverside', 'coastal', 'mountain', 'swamp', 
  'underground', 'floating', 'jungle'
])
const politicalSystemEnum = z.enum([
  'monarchy', 'democracy', 'oligarchy', 'theocracy', 'anarchy',
  'military', 'tribal', 'merchant_guild', 'magocracy'
])

export const CreateTownSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign ID'),
  name: z.string().min(1, 'Town name is required').max(FIELD_LIMITS.TOWN_NAME, 'Town name too long'),
  description: z.string().max(FIELD_LIMITS.TOWN_DESCRIPTION, 'Description too long').optional().nullable(),
  population: z.number().int().min(0).optional().nullable(),
  size: townSizeEnum.optional().nullable(),
  location: geographicLocationEnum.optional().nullable(),
  ruler: z.string().max(FIELD_LIMITS.TOWN_RULER).optional().nullable(),
  political_system: politicalSystemEnum.optional().nullable(),
  history: z.string().max(FIELD_LIMITS.TOWN_HISTORY).optional().nullable(),
})

export const UpdateTownSchema = z.object({
  name: z.string().min(1, 'Town name is required').max(FIELD_LIMITS.TOWN_NAME, 'Town name too long').optional(),
  description: z.string().max(FIELD_LIMITS.TOWN_DESCRIPTION, 'Description too long').optional().nullable(),
  population: z.number().int().min(0).optional().nullable(),
  size: townSizeEnum.optional().nullable(),
  location: geographicLocationEnum.optional().nullable(),
  ruler: z.string().max(FIELD_LIMITS.TOWN_RULER).optional().nullable(),
  ruler_id: z.string().uuid().optional().nullable(),
  political_system: politicalSystemEnum.optional().nullable(),
  history: z.string().max(FIELD_LIMITS.TOWN_HISTORY).optional().nullable(),
})

export const GenerateTownSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt too long'),
  population: z.number().int().min(0).optional(),
  size: townSizeEnum.optional(),
  location: geographicLocationEnum.optional(),
})

export type CreateTownInput = z.infer<typeof CreateTownSchema>
export type UpdateTownInput = z.infer<typeof UpdateTownSchema>
export type GenerateTownInput = z.infer<typeof GenerateTownSchema>
