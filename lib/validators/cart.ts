/**
 * Cart Validators
 * @description Zod schemas for shopping cart operations
 */

import { z } from 'zod'

/**
 * Schema for adding an item to the cart
 */
export const AddToCartSchema = z.object({
  /**
   * The ID of the character adding the item to the cart
   */
  characterId: z.string().uuid(),
  /**
   * The ID of the item being added to the cart
   */
  itemId: z.string().uuid(),
  /**
   * The ID of the shop the item is being added from
   */
  shopId: z.string().uuid(),
  /**
   * The quantity of the item being added to the cart (defaults to 1)
   */
  quantity: z.number().int().positive().default(1),
})

/**
 * Schema for updating a cart item
 */
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
