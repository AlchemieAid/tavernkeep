import { z } from 'zod'

export const AddToCartSchema = z.object({
  characterId: z.string().uuid(),
  itemId: z.string().uuid(),
  shopId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
})

export const UpdateCartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
})

export const RemoveFromCartSchema = z.object({
  cartItemId: z.string().uuid(),
})

export type AddToCartInput = z.infer<typeof AddToCartSchema>
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>
export type RemoveFromCartInput = z.infer<typeof RemoveFromCartSchema>
