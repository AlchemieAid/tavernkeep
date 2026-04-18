/**
 * AI Provider Factory
 * 
 * Creates AI clients based on environment configuration.
 * Allows easy switching between providers via environment variables.
 */

import { AIClient, AIProvider } from './types'
import { OpenAIClient } from './openai-client'
import { GeminiClient } from './gemini-client'

/**
 * Get the configured AI provider from environment
 * Defaults to 'gemini' for speed
 */
export function getConfiguredProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER as AIProvider
  return provider || 'gemini'
}

/**
 * Get the configured model name from environment
 */
export function getConfiguredModel(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_MODEL || 'gpt-4o-mini'
    case 'gemini':
      return process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    case 'claude':
      return process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307'
    default:
      return 'gemini-2.0-flash-exp'
  }
}

/**
 * Create an AI client based on configuration
 * 
 * @param provider - Optional provider override (defaults to env config)
 * @returns Configured AI client
 * 
 * @example
 * ```typescript
 * // Use configured provider (from env)
 * const client = createAIClient()
 * 
 * // Override to use specific provider
 * const geminiClient = createAIClient('gemini')
 * const openaiClient = createAIClient('openai')
 * ```
 */
export function createAIClient(provider?: AIProvider): AIClient {
  const selectedProvider = provider || getConfiguredProvider()
  const model = getConfiguredModel(selectedProvider)

  switch (selectedProvider) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not configured')
      }
      return new OpenAIClient(apiKey, model)
    }

    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not configured')
      }
      return new GeminiClient(apiKey, model)
    }

    case 'claude': {
      throw new Error('Claude provider not yet implemented. Use OpenAI or Gemini.')
    }

    default:
      throw new Error(`Unknown AI provider: ${selectedProvider}`)
  }
}

// Re-export types
export * from './types'
export { OpenAIClient } from './openai-client'
export { GeminiClient } from './gemini-client'
