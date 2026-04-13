'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Check } from 'lucide-react'

interface AITownGeneratorProps {
  campaignId: string
}

interface UsageInfo {
  tokens: number
  estimatedCost: string
  model: string
}

type GenerationStep = 'idle' | 'generating_town' | 'creating_shops' | 'summoning_npcs' | 'stocking_items' | 'complete'

export function AITownGenerator({ campaignId }: AITownGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null)
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle')
  const router = useRouter()

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setCurrentStep('generating_town')

    try {
      // Simulate progress steps
      setTimeout(() => setCurrentStep('creating_shops'), 1000)
      setTimeout(() => setCurrentStep('summoning_npcs'), 2000)
      setTimeout(() => setCurrentStep('stocking_items'), 3000)

      const response = await fetch('/api/dm/generate-town', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate town')
      }

      setCurrentStep('complete')

      // Redirect to the new town after a brief delay to show completion
      setTimeout(() => {
        if (data.data?.town?.id) {
          router.push(`/dm/towns/${data.data.town.id}`)
          router.refresh()
        }
      }, 1500)
    } catch (err) {
      setError((err as Error).message)
      setIsGenerating(false)
      setCurrentStep('idle')
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
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {isGenerating && (
          <div className="bg-surface-container p-4 rounded-md space-y-2">
            <p className="text-sm font-semibold text-on-surface">Building Your Town</p>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-sm ${currentStep !== 'idle' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep !== 'idle' && currentStep !== 'generating_town' ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Generating town with AI...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'creating_shops' || currentStep === 'summoning_npcs' || currentStep === 'stocking_items' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep === 'summoning_npcs' || currentStep === 'stocking_items' || currentStep === 'complete' ? <Check className="w-4 h-4" /> : currentStep === 'creating_shops' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Creating shops...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'summoning_npcs' || currentStep === 'stocking_items' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep === 'stocking_items' || currentStep === 'complete' ? <Check className="w-4 h-4" /> : currentStep === 'summoning_npcs' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Summoning notable people...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'stocking_items' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep === 'complete' ? <Check className="w-4 h-4" /> : currentStep === 'stocking_items' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Stocking shops with items...</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md space-y-1">
            <p className="font-semibold">Town Created Successfully!</p>
            <p className="text-xs">Complete with shops, notable people, and items</p>
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
          Creates a complete town with 3-5 shops, 3-5 notable people, and 5-10 items per shop. All context-aware and customizable.
        </p>
      </CardContent>
    </Card>
  )
}
