/**
 * AI Provider Abstraction Types
 * 
 * Defines a unified interface for different AI providers (OpenAI, Gemini, Claude, etc.)
 * allowing easy switching between models without changing generation code.
 */

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'gemini' | 'claude'

/**
 * AI model configuration
 */
export interface AIModelConfig {
  /** The provider to use */
  provider: AIProvider
  /** The specific model name */
  model: string
  /** Temperature for generation (0-1) */
  temperature?: number
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Message format for AI requests
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * AI generation request
 */
export interface AIGenerationRequest {
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json' | 'text'
}

/**
 * AI generation response
 */
export interface AIGenerationResponse {
  content: string
  tokensUsed?: {
    input: number
    output: number
    total: number
  }
  model: string
  provider: AIProvider
}

/**
 * Unified AI client interface
 */
export interface AIClient {
  /** Generate content from messages */
  generate(request: AIGenerationRequest): Promise<AIGenerationResponse>
  
  /** Get the provider name */
  getProvider(): AIProvider
  
  /** Get the model name */
  getModel(): string
}
