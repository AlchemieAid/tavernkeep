/**
 * OpenAI Client Implementation
 * 
 * Wraps OpenAI API in the unified AIClient interface
 */

import OpenAI from 'openai'
import { AIClient, AIGenerationRequest, AIGenerationResponse, AIMessage, AIImageGenerationRequest, AIImageGenerationResponse } from './types'

export class OpenAIClient implements AIClient {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.maxTokens,
      response_format: request.responseFormat === 'json' 
        ? { type: 'json_object' } 
        : undefined
    })

    return {
      content: completion.choices[0].message.content || '',
      tokensUsed: {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      },
      model: this.model,
      provider: 'openai'
    }
  }

  async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    const size = request.size || '1024x1024'
    const count = request.count || 1
    const style = request.style || 'vivid'

    // OpenAI DALL-E 3 for image generation
    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: request.prompt,
      n: count,
      size: size as '256x256' | '512x512' | '1024x1024',
      response_format: 'url',
      style: style as 'natural' | 'vivid'
    })

    const urls = response.data?.map(item => item.url).filter((url): url is string => Boolean(url)) || []

    return {
      urls,
      model: 'dall-e-3',
      provider: 'openai'
    }
  }

  getProvider() {
    return 'openai' as const
  }

  getModel() {
    return this.model
  }
}
