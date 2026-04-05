'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Check } from 'lucide-react'

interface UsageInfo {
  tokens: number
  estimatedCost: string
  model: string
}

type GenerationStep = 'idle' | 'validating' | 'checking_rate_limit' | 'generating_ai' | 'saving_campaign' | 'complete'

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: 'Ready',
  validating: 'Validating Request',
  checking_rate_limit: 'Checking Rate Limit',
  generating_ai: 'Refining the World',
  saving_campaign: 'Creating Campaign',
  complete: 'Complete'
}

export function AICampaignGenerator() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null)
  const router = useRouter()

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setCurrentStep('validating')

    try {
      setCurrentStep('checking_rate_limit')
      
      const response = await fetch('/api/dm/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      setCurrentStep('generating_ai')
      
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate campaign')
      }

      setCurrentStep('saving_campaign')

      // Handle both response formats for backward compatibility
      const campaign = result.data?.campaign || result.campaign
      const usage = result.data?.usage || result.usage

      if (!campaign) {
        console.error('Invalid response structure:', result)
        throw new Error('Invalid response from server - missing campaign data')
      }

      // Store usage info
      if (usage) {
        setLastUsage(usage)
      }

      setCurrentStep('complete')

      // Redirect to the new campaign after a brief delay to show completion
      setTimeout(() => {
        router.push(`/dm/campaigns/${campaign.id}`)
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error('Campaign generation error:', err)
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
          AI Campaign Generator
        </CardTitle>
        <CardDescription>
          Describe your campaign idea and let AI create a rich setting with suggested towns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., A dark fantasy campaign set in a cursed kingdom where the dead won't stay buried..."
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
            <p className="text-sm font-semibold text-on-surface">Generation Progress</p>
            <div className="space-y-2">
              {(['validating', 'checking_rate_limit', 'generating_ai', 'saving_campaign', 'complete'] as GenerationStep[]).map((step) => {
                const stepIndex = ['validating', 'checking_rate_limit', 'generating_ai', 'saving_campaign', 'complete'].indexOf(step)
                const currentIndex = ['validating', 'checking_rate_limit', 'generating_ai', 'saving_campaign', 'complete'].indexOf(currentStep)
                const isComplete = stepIndex < currentIndex || currentStep === 'complete'
                const isCurrent = step === currentStep
                
                return (
                  <div key={step} className="flex items-center gap-2 text-sm">
                    {isComplete ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-outline" />
                    )}
                    <span className={isCurrent ? 'font-semibold text-on-surface' : isComplete ? 'text-on-surface-variant' : 'text-outline'}>
                      {STEP_LABELS[step]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {lastUsage && currentStep === 'complete' && (
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
              Generating Campaign...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Campaign
            </>
          )}
        </Button>

        <p className="text-xs text-on-surface-variant">
          This will create a new campaign with AI-generated lore and suggested towns. You can customize everything afterwards.
        </p>
      </CardContent>
    </Card>
  )
}
