import { z } from 'zod'

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  ruleset: z.string().max(50).default('5e'),
  setting: z.string().max(200).optional().nullable(),
  history: z.string().max(2000).optional().nullable(),
  currency: z.string().max(100).default('Gold Pieces (gp)'),
  pantheon: z.string().max(1000).optional().nullable(),
})

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  ruleset: z.string().max(50).optional(),
  setting: z.string().max(200).optional().nullable(),
  history: z.string().max(2000).optional().nullable(),
  currency: z.string().max(100).optional(),
  pantheon: z.string().max(1000).optional().nullable(),
})

export const GenerateCampaignSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt too long'),
  ruleset: z.string().max(50).optional(),
  setting: z.string().max(200).optional(),
})

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>
export type GenerateCampaignInput = z.infer<typeof GenerateCampaignSchema>
