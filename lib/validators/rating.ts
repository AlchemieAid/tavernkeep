import { z } from 'zod'

export const RateGenerationSchema = z.object({
  cacheId: z.string().uuid('Invalid cache ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  feedback: z.string().max(1000, 'Feedback too long').optional(),
})

export type RateGenerationInput = z.infer<typeof RateGenerationSchema>
