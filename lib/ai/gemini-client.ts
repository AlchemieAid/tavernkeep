/**
 * Google Gemini Client Implementation
 * 
 * Wraps Google Gemini API in the unified AIClient interface
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIClient, AIGenerationRequest, AIGenerationResponse } from './types'

export class GeminiClient implements AIClient {
  private genAI: GoogleGenerativeAI
  private modelName: string

  constructor(apiKey: string, model: string = 'gemini-1.5-flash-latest') {
    this.genAI = new GoogleGenerativeAI(apiKey)
    // Ensure model name has -latest suffix for v1beta API
    this.modelName = model.endsWith('-latest') ? model : `${model}-latest`
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: request.temperature ?? 0.8,
        maxOutputTokens: request.maxTokens,
        responseMimeType: request.responseFormat === 'json' 
          ? 'application/json' 
          : 'text/plain'
      }
    })

    // Gemini uses a different message format - combine system and user messages
    const systemMessage = request.messages.find(m => m.role === 'system')
    const userMessages = request.messages.filter(m => m.role === 'user')
    
    // Combine system prompt with user prompt
    const prompt = systemMessage 
      ? `${systemMessage.content}\n\n${userMessages.map(m => m.content).join('\n')}`
      : userMessages.map(m => m.content).join('\n')

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Gemini doesn't always provide token counts
    const usageMetadata = response.usageMetadata

    return {
      content: text,
      tokensUsed: usageMetadata ? {
        input: usageMetadata.promptTokenCount || 0,
        output: usageMetadata.candidatesTokenCount || 0,
        total: usageMetadata.totalTokenCount || 0
      } : undefined,
      model: this.modelName,
      provider: 'gemini'
    }
  }

  getProvider() {
    return 'gemini' as const
  }

  getModel() {
    return this.modelName
  }
}
