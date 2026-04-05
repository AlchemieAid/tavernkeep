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

type GenerationStep = 'idle' | 'consulting_maps' | 'rolling_dice' | 'placing_buildings' | 'summoning_npcs' | 'stocking_shops' | 'complete'

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
    setCurrentStep('consulting_maps')

    try {
      // Simulate progress steps
      setTimeout(() => setCurrentStep('rolling_dice'), 800)
      setTimeout(() => setCurrentStep('placing_buildings'), 1600)
      setTimeout(() => setCurrentStep('summoning_npcs'), 2400)
      setTimeout(() => setCurrentStep('stocking_shops'), 3200)

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

      // Store usage info
      if (data.usage) {
        setLastUsage(data.usage)
      }

      // Redirect to the new town after a brief delay to show completion
      setTimeout(() => {
        router.push(`/dm/towns/${data.town.id}`)
        router.refresh()
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
            <p className="text-sm font-semibold text-on-surface">Establishing Settlement</p>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'consulting_maps' || currentStep === 'rolling_dice' || currentStep === 'placing_buildings' || currentStep === 'summoning_npcs' || currentStep === 'stocking_shops' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {(currentStep === 'rolling_dice' || currentStep === 'placing_buildings' || currentStep === 'summoning_npcs' || currentStep === 'stocking_shops' || currentStep === 'complete') ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Consulting ancient maps...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'rolling_dice' || currentStep === 'placing_buildings' || currentStep === 'summoning_npcs' || currentStep === 'stocking_shops' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {(currentStep === 'placing_buildings' || currentStep === 'summoning_npcs' || currentStep === 'stocking_shops' || currentStep === 'complete') ? <Check className="w-4 h-4" /> : currentStep === 'rolling_dice' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Rolling for population and size...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'placing_buildings' || currentStep === 'summoning_npcs' || currentStep === 'stocking_shops' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {(currentStep === 'summoning_npcs' || currentStep === 'stocking_shops' || currentStep === 'complete') ? <Check className="w-4 h-4" /> : currentStep === 'placing_buildings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Placing buildings and landmarks...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'summoning_npcs' || currentStep === 'stocking_shops' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {(currentStep === 'stocking_shops' || currentStep === 'complete') ? <Check className="w-4 h-4" /> : currentStep === 'summoning_npcs' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Summoning notable residents...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'stocking_shops' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep === 'complete' ? <Check className="w-4 h-4" /> : currentStep === 'stocking_shops' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Stocking shops and taverns...</span>
              </div>
            </div>
          </div>
        )}

        {lastUsage && currentStep === 'complete' && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md space-y-1">
            <p className="font-semibold">Settlement Established!</p>
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
