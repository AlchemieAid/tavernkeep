/**
 * Notable Person Validators
 * @description Zod schemas for NPC creation and updates
 */

import { z } from 'zod'
import { FIELD_LIMITS } from '@/lib/constants/field-limits'

export const CreateNotablePersonSchema = z.object({
  town_id: z.string().uuid('Invalid town ID'),
  name: z.string().min(1, 'Name is required').max(FIELD_LIMITS.NOTABLE_PERSON_NAME, 'Name too long'),
  race: z.string().max(FIELD_LIMITS.NOTABLE_PERSON_RACE).optional().nullable(),
  role: z.string().min(1, 'Role is required').max(100, 'Role too long'),
  backstory: z.string().max(FIELD_LIMITS.NOTABLE_PERSON_BACKSTORY).optional().nullable(),
  motivation: z.string().max(FIELD_LIMITS.NOTABLE_PERSON_MOTIVATION).optional().nullable(),
  personality_traits: z.array(z.string().max(100)).max(10).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
})

export const UpdateNotablePersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(FIELD_LIMITS.NOTABLE_PERSON_NAME, 'Name too long').optional(),
  race: z.string().max(FIELD_LIMITS.NOTABLE_PERSON_RACE).optional().nullable(),
  role: z.string().min(1, 'Role is required').max(100, 'Role too long').optional(),
  backstory: z.string().max(FIELD_LIMITS.NOTABLE_PERSON_BACKSTORY).optional().nullable(),
  motivation: z.string().max(FIELD_LIMITS.NOTABLE_PERSON_MOTIVATION).optional().nullable(),
  personality_traits: z.array(z.string().max(100)).max(10).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
})

export const GenerateNotablePersonSchema = z.object({
  townId: z.string().uuid('Invalid town ID'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt too long'),
  role: z.string().max(100).optional(),
  count: z.number().int().min(1).max(20).default(1),
})

export type CreateNotablePersonInput = z.infer<typeof CreateNotablePersonSchema>
export type UpdateNotablePersonInput = z.infer<typeof UpdateNotablePersonSchema>
export type GenerateNotablePersonInput = z.infer<typeof GenerateNotablePersonSchema>
