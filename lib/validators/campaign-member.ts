import { z } from 'zod'

export const campaignMemberSchema = z.object({
  campaign_id: z.string().uuid(),
  player_id: z.string().uuid(),
  invited_by: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
})

export const updateCampaignMemberSchema = z.object({
  is_active: z.boolean().optional(),
  last_active_at: z.string().datetime().optional(),
})

export type CampaignMemberInput = z.infer<typeof campaignMemberSchema>
export type UpdateCampaignMemberInput = z.infer<typeof updateCampaignMemberSchema>
