import { createClient as createServerClient } from './server'
import { createClient as createBrowserClient } from './client'
import type { Database } from './database.types'

// Helper types for typed queries
export type TypedSupabaseClient = Awaited<ReturnType<typeof createServerClient>>
export type TypedBrowserClient = ReturnType<typeof createBrowserClient>

// Re-export for convenience
export { createServerClient, createBrowserClient }
export type { Database }
