# AI Provider Abstraction Layer

This directory contains a unified interface for different AI providers, allowing you to easily switch between OpenAI, Google Gemini, Anthropic Claude, and other LLMs without changing your generation code.

## Quick Start

### Using the Default Provider (Gemini)

```typescript
import { createAIClient } from '@/lib/ai'

const client = createAIClient()
const response = await client.generate({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Generate a fantasy campaign.' }
  ],
  temperature: 0.8,
  responseFormat: 'json'
})

console.log(response.content)
```

### Switching Providers

Set the `AI_PROVIDER` environment variable:

```bash
# Use Gemini (default, fastest)
AI_PROVIDER=gemini

# Use OpenAI
AI_PROVIDER=openai

# Use Claude (not yet implemented)
AI_PROVIDER=claude
```

### Override Provider Programmatically

```typescript
import { createAIClient } from '@/lib/ai'

// Force use of OpenAI
const openaiClient = createAIClient('openai')

// Force use of Gemini
const geminiClient = createAIClient('gemini')
```

## Supported Providers

### ✅ Google Gemini (Recommended)
- **Speed**: 2-8 seconds ⚡⚡
- **Cost**: FREE tier available
- **Model**: `gemini-1.5-flash`
- **Setup**: Get API key from https://aistudio.google.com/app/apikey

### ✅ OpenAI
- **Speed**: 10-30 seconds (gpt-3.5-turbo) or 60-90 seconds (gpt-4o-mini)
- **Cost**: $0.15-0.50 per 1M tokens
- **Models**: `gpt-4o-mini`, `gpt-3.5-turbo`, `gpt-4o`
- **Setup**: Get API key from https://platform.openai.com/api-keys

### ⏳ Anthropic Claude (Coming Soon)
- **Speed**: 3-10 seconds ⚡
- **Cost**: $0.25 per 1M tokens
- **Model**: `claude-3-haiku-20240307`
- **Status**: Interface ready, implementation pending

## Environment Variables

```bash
# Provider selection
AI_PROVIDER=gemini  # or openai, claude

# Gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash

# OpenAI
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini

# Claude (not yet implemented)
CLAUDE_API_KEY=your_key_here
CLAUDE_MODEL=claude-3-haiku-20240307
```

## Architecture

### Unified Interface

All providers implement the `AIClient` interface:

```typescript
interface AIClient {
  generate(request: AIGenerationRequest): Promise<AIGenerationResponse>
  getProvider(): AIProvider
  getModel(): string
}
```

### Request Format

```typescript
interface AIGenerationRequest {
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json' | 'text'
}
```

### Response Format

```typescript
interface AIGenerationResponse {
  content: string
  tokensUsed?: {
    input: number
    output: number
    total: number
  }
  model: string
  provider: AIProvider
}
```

## Performance Comparison

| Provider | Model | Avg Speed | Cost (1M tokens) | Quality |
|----------|-------|-----------|------------------|---------|
| **Gemini** | gemini-1.5-flash | **2-8s** ⚡⚡ | **FREE** | Excellent |
| OpenAI | gpt-3.5-turbo | 10-30s | $0.50 | Good |
| OpenAI | gpt-4o-mini | 60-90s | $0.15 | Excellent |
| Claude | claude-3-haiku | 3-10s ⚡ | $0.25 | Excellent |

**Recommendation**: Use Gemini for the best user experience (speed + free tier).

## Adding a New Provider

1. Create a new client class implementing `AIClient`:

```typescript
// lib/ai/my-provider-client.ts
import { AIClient, AIGenerationRequest, AIGenerationResponse } from './types'

export class MyProviderClient implements AIClient {
  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    // Implementation
  }
  
  getProvider() { return 'myprovider' as const }
  getModel() { return this.model }
}
```

2. Add to the factory in `lib/ai/index.ts`:

```typescript
case 'myprovider': {
  const apiKey = process.env.MYPROVIDER_API_KEY
  if (!apiKey) throw new Error('MYPROVIDER_API_KEY not configured')
  return new MyProviderClient(apiKey)
}
```

3. Update the `AIProvider` type in `lib/ai/types.ts`:

```typescript
export type AIProvider = 'openai' | 'gemini' | 'claude' | 'myprovider'
```

## Files

- `types.ts` - TypeScript interfaces and types
- `index.ts` - Factory function and exports
- `openai-client.ts` - OpenAI implementation
- `gemini-client.ts` - Google Gemini implementation
- `claude-client.ts` - Anthropic Claude (coming soon)

## Usage in Generation Code

The orchestrator automatically uses the configured provider:

```typescript
// lib/generation/orchestrator.ts
import { createAIClient } from '@/lib/ai'

const aiClient = createAIClient()  // Uses AI_PROVIDER env var

// Later in code...
const response = await aiClient.generate({
  messages: [...],
  temperature: 0.8,
  responseFormat: 'json'
})
```

No changes needed when switching providers!
