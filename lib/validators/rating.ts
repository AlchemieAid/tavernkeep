/**
 * Rating Validators
 * @description Zod schemas for AI generation quality ratings
 */

import { z } from 'zod'

/**
 * Schema for rate generation input
 */
export const RateGenerationSchema = z.object({
  /**
   * Unique cache ID
   */
  cacheId: z.string().uuid('Invalid cache ID'),
  /**
   * Rating given to the AI generation (1-5)
   */
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  /**
   * Optional feedback for the AI generation
   */
  feedback: z.string().max(1000, 'Feedback too long').optional(),
})

/**
 * Type for rate generation input
 */
export type RateGenerationInput = z.infer<typeof RateGenerationSchema>
