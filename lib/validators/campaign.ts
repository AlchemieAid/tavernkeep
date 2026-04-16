/**
 * Campaign Validators
 * @description Zod schemas for campaign creation and updates
 */

import { z } from 'zod'
import { FIELD_LIMITS } from '@/lib/constants/field-limits'

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(FIELD_LIMITS.CAMPAIGN_NAME, 'Campaign name too long'),
  description: z.string().max(FIELD_LIMITS.CAMPAIGN_DESCRIPTION, 'Description too long').optional().nullable(),
  ruleset: z.string().max(FIELD_LIMITS.CAMPAIGN_RULESET).default('5e'),
  setting: z.string().max(FIELD_LIMITS.CAMPAIGN_SETTING).optional().nullable(),
  history: z.string().max(FIELD_LIMITS.CAMPAIGN_HISTORY).optional().nullable(),
  currency_name: z.string().max(FIELD_LIMITS.CAMPAIGN_CURRENCY_NAME).default('gp'),
  currency_description: z.string().max(FIELD_LIMITS.CAMPAIGN_CURRENCY_DESCRIPTION).optional().nullable(),
  pantheon: z.string().max(FIELD_LIMITS.CAMPAIGN_PANTHEON).optional().nullable(),
})

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(FIELD_LIMITS.CAMPAIGN_NAME, 'Campaign name too long').optional(),
  description: z.string().max(FIELD_LIMITS.CAMPAIGN_DESCRIPTION, 'Description too long').optional().nullable(),
  ruleset: z.string().max(FIELD_LIMITS.CAMPAIGN_RULESET).optional(),
  setting: z.string().max(FIELD_LIMITS.CAMPAIGN_SETTING).optional().nullable(),
  history: z.string().max(FIELD_LIMITS.CAMPAIGN_HISTORY).optional().nullable(),
  currency_name: z.string().max(FIELD_LIMITS.CAMPAIGN_CURRENCY_NAME).optional(),
  currency_description: z.string().max(FIELD_LIMITS.CAMPAIGN_CURRENCY_DESCRIPTION).optional().nullable(),
  pantheon: z.string().max(FIELD_LIMITS.CAMPAIGN_PANTHEON).optional().nullable(),
})

export const GenerateCampaignSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(FIELD_LIMITS.AI_PROMPT, 'Prompt too long'),
  ruleset: z.string().max(FIELD_LIMITS.CAMPAIGN_RULESET).optional(),
  setting: z.string().max(FIELD_LIMITS.CAMPAIGN_SETTING).optional(),
})

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>
export type GenerateCampaignInput = z.infer<typeof GenerateCampaignSchema>
