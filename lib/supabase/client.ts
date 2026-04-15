/**
 * Supabase Browser Client
 * 
 * @fileoverview
 * Creates a Supabase client for client-side operations in Next.js App Router.
 * Handles authentication via browser cookies and provides real-time subscriptions.
 * 
 * @architecture
 * **Client-Side Authentication Flow:**
 * ```
 * 1. React Client Component calls createClient()
 * 2. Client reads auth cookies from browser
 * 3. Supabase validates session from cookies
 * 4. Returns authenticated client with user context
 * ```
 * 
 * **Use Cases:**
 * - Client Components with 'use client' directive
 * - Real-time subscriptions (Supabase Realtime)
 * - Client-side mutations (cart, favorites)
 * - Interactive features (search, filters)
 * 
 * **Cookie Management:**
 * - Automatically reads cookies from browser
 * - Automatically sets cookies for session refresh
 * - No manual cookie handling required
 * 
 * **Real-time Features:**
 * - Subscribe to database changes
 * - Listen to INSERT, UPDATE, DELETE events
 * - Filter subscriptions by table/row
 * - Automatic reconnection on network issues
 * 
 * **Type Safety:**
 * - Uses generated Database types from Supabase CLI
 * - Provides full TypeScript autocomplete
 * - Validates queries at compile time
 * 
 * **Security:**
 * - Uses NEXT_PUBLIC_SUPABASE_ANON_KEY (RLS enforced)
 * - All queries subject to Row Level Security policies
 * - User context automatically applied
 * - Safe to use in browser (no secrets exposed)
 * 
 * @example
 * ```typescript
 * // In a Client Component
 * 'use client'
 * 
 * import { createClient } from '@/lib/supabase/client'
 * import { useEffect, useState } from 'react'
 * 
 * export function CartSidebar() {
 *   const supabase = createClient()
 *   const [items, setItems] = useState([])
 *   
 *   useEffect(() => {
 *     // Fetch initial data
 *     supabase.from('cart_items').select('*').then(({ data }) => setItems(data))
 *     
 *     // Subscribe to real-time updates
 *     const channel = supabase
 *       .channel('cart-changes')
 *       .on('postgres_changes', {
 *         event: '*',
 *         schema: 'public',
 *         table: 'cart_items'
 *       }, (payload) => {
 *         // Handle real-time update
 *       })
 *       .subscribe()
 *     
 *     return () => { supabase.removeChannel(channel) }
 *   }, [])
 * }
 * ```
 * 
 * @see {@link https://supabase.com/docs/guides/auth/server-side/nextjs}
 * @see {@link https://supabase.com/docs/guides/realtime}
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/**
 * Create a Supabase client for browser-side operations
 * 
 * @returns Authenticated Supabase client for browser use
 * 
 * @description
 * Creates a browser-side Supabase client with automatic cookie management.
 * This client is used in:
 * - Client Components ('use client')
 * - React hooks (useState, useEffect)
 * - Event handlers (onClick, onSubmit)
 * - Real-time subscriptions
 * 
 * **Singleton Pattern:**
 * The client is created once per component render. For optimal performance,
 * create the client at the component level, not inside hooks.
 * 
 * **Authentication:**
 * - Automatically reads session from browser cookies
 * - Automatically refreshes expired sessions
 * - No manual session management required
 * 
 * **Real-time Subscriptions:**
 * Always clean up subscriptions in useEffect cleanup:
 * ```typescript
 * useEffect(() => {
 *   const channel = supabase.channel('my-channel')...
 *   return () => { supabase.removeChannel(channel) }
 * }, [])
 * ```
 * 
 * @example
 * ```typescript
 * 'use client'
 * 
 * const supabase = createClient()
 * 
 * // Query data
 * const { data } = await supabase.from('shops').select('*')
 * 
 * // Insert data
 * await supabase.from('cart_items').insert({ item_id, quantity })
 * 
 * // Subscribe to changes
 * supabase.channel('changes').on('postgres_changes', ...)
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
