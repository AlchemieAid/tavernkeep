/**
 * Google Gemini Client Implementation
 * 
 * Wraps Google Gemini API in the unified AIClient interface
 * Uses the new @google/genai SDK
 */

import { GoogleGenAI } from '@google/genai'
import { AIClient, AIGenerationRequest, AIGenerationResponse, AIImageGenerationRequest, AIImageGenerationResponse } from './types'

export class GeminiClient implements AIClient {
  private ai: GoogleGenAI
  private modelName: string

  constructor(apiKey: string, model: string = 'gemini-2.5-flash-lite') {
    // New SDK uses environment variable by default, but we pass it explicitly
    this.ai = new GoogleGenAI({ apiKey })
    this.modelName = model
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    // Combine system and user messages into a single prompt
    const systemMessage = request.messages.find(m => m.role === 'system')
    const userMessages = request.messages.filter(m => m.role === 'user')
    
    const contents = systemMessage 
      ? `${systemMessage.content}\n\n${userMessages.map(m => m.content).join('\n')}`
      : userMessages.map(m => m.content).join('\n')

    // Use new SDK API
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents,
      config: {
        temperature: request.temperature ?? 0.8,
        maxOutputTokens: request.maxTokens,
        responseMimeType: request.responseFormat === 'json' 
          ? 'application/json' 
          : 'text/plain'
      }
    })

    return {
      content: response.text || '',
      tokensUsed: response.usageMetadata ? {
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0,
        total: response.usageMetadata.totalTokenCount || 0
      } : undefined,
      model: this.modelName,
      provider: 'gemini'
    }
  }

  async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    const size = request.size || '1024x1024'
    const count = request.count || 1
    
    // Gemini Imagen for image generation
    const response = await this.ai.models.generateImages({
      model: 'imagen-3.0-generate-001', // Using Imagen 3 for now
      prompt: request.prompt,
      config: {
        numberOfImages: count,
        aspectRatio: size === '1024x1024' ? '1:1' : size === '512x512' ? '1:1' : '1:1'
      }
    })

    // Gemini returns image bytes, not URLs
    // Convert to data URLs for now (in production, upload to storage)
    const urls: string[] = []
    if (response.generatedImages) {
      for (const generatedImage of response.generatedImages) {
        const imageBytes = generatedImage.image?.imageBytes
        if (imageBytes) {
          // Convert base64 bytes to data URL
          const base64 = Buffer.from(imageBytes, 'base64').toString('base64')
          urls.push(`data:image/png;base64,${base64}`)
        }
      }
    }

    return {
      urls,
      model: 'imagen-3.0-generate-001',
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
