'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles } from 'lucide-react'

interface AITownGeneratorProps {
  campaignId: string
}

interface UsageInfo {
  tokens: number
  estimatedCost: string
  model: string
}

export function AITownGenerator({ campaignId }: AITownGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null)
  const router = useRouter()

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/dm/generate-town', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate town')
      }

      // Store usage info
      if (data.usage) {
        setLastUsage(data.usage)
      }

      // Redirect to the new town after a brief delay to show usage
      setTimeout(() => {
        router.push(`/dm/towns/${data.town.id}`)
      }, 2000)
    } catch (err) {
      setError((err as Error).message)
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          AI Town Generator
        </CardTitle>
        <CardDescription>
          Describe your town idea and let AI create a detailed settlement with suggested shops
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., A bustling port city known for its black market and smuggling operations..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={isGenerating}
        />
        
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {lastUsage && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md space-y-1">
            <p className="font-semibold">Generation Complete!</p>
            <p>Tokens: {lastUsage.tokens.toLocaleString()} | Cost: ${lastUsage.estimatedCost}</p>
            <p className="text-xs">Model: {lastUsage.model}</p>
          </div>
        )}

        <Button 
          onClick={handleGenerate} 
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Town...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Town
            </>
          )}
        </Button>

        <p className="text-xs text-on-surface-variant">
          This will create a new town with AI-generated details and suggested shops. You can customize everything afterwards.
        </p>
      </CardContent>
    </Card>
  )
}
