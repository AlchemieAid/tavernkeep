import { z } from 'zod'

const notablePersonRoleEnum = z.enum([
  'shopkeeper', 'quest_giver', 'ruler', 'priest', 'magician',
  'merchant', 'guard', 'noble', 'commoner', 'blacksmith',
  'innkeeper', 'healer', 'scholar', 'criminal', 'artisan'
])

export const CreateNotablePersonSchema = z.object({
  town_id: z.string().uuid('Invalid town ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  race: z.string().max(50).optional().nullable(),
  role: notablePersonRoleEnum,
  backstory: z.string().max(2000).optional().nullable(),
  motivation: z.string().max(500).optional().nullable(),
  personality_traits: z.array(z.string().max(100)).max(10).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
})

export const UpdateNotablePersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  race: z.string().max(50).optional().nullable(),
  role: notablePersonRoleEnum.optional(),
  backstory: z.string().max(2000).optional().nullable(),
  motivation: z.string().max(500).optional().nullable(),
  personality_traits: z.array(z.string().max(100)).max(10).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
})

export const GenerateNotablePersonSchema = z.object({
  townId: z.string().uuid('Invalid town ID'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt too long'),
  role: notablePersonRoleEnum.optional(),
  count: z.number().int().min(1).max(20).default(1),
})

export type CreateNotablePersonInput = z.infer<typeof CreateNotablePersonSchema>
export type UpdateNotablePersonInput = z.infer<typeof UpdateNotablePersonSchema>
export type GenerateNotablePersonInput = z.infer<typeof GenerateNotablePersonSchema>
