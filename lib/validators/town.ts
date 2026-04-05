import { z } from 'zod'

export const CreateTownSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign ID'),
  name: z.string().min(1, 'Town name is required').max(100, 'Town name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
})

export const UpdateTownSchema = z.object({
  name: z.string().min(1, 'Town name is required').max(100, 'Town name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
})

export const GenerateTownSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt too long'),
})

export type CreateTownInput = z.infer<typeof CreateTownSchema>
export type UpdateTownInput = z.infer<typeof UpdateTownSchema>
export type GenerateTownInput = z.infer<typeof GenerateTownSchema>
