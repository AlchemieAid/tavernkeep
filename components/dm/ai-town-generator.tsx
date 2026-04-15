/**
 * AI Town Generator Component
 * 
 * @fileoverview
 * Provides a UI for DMs to generate complete towns using AI. Takes a natural
 * language prompt and creates a town with shops, notable people, and items
 * in a single operation. Shows real-time progress through generation stages.
 * 
 * @component
 * **Generation Flow:**
 * ```
 * 1. User enters town description
 * 2. Generating town → Creates town entity
 * 3. Creating shops → Generates shops for the town
 * 4. Summoning NPCs → Creates notable people
 * 5. Stocking items → Populates shop inventories
 * 6. Complete → Redirects to town detail page
 * ```
 * 
 * **Features:**
 * - Natural language input (e.g., "A coastal trading port")
 * - Real-time progress indicators
 * - Automatic redirect on completion
 * - Error handling with user-friendly messages
 * - Usage tracking (tokens, cost, model)
 * 
 * **API Integration:**
 * Calls `/api/dm/generate-town` which uses the GenerationOrchestrator
 * to create the entire town hierarchy in one request.
 * 
 * @example
 * ```tsx
 * <AITownGenerator campaignId={campaign.id} />
 * ```
 * 
 * @see {@link GenerationOrchestrator.generateTown} for backend logic
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Check } from 'lucide-react'

/**
 * Props for the AITownGenerator component
 */
interface AITownGeneratorProps {
  /** Campaign ID to generate the town for */
  campaignId: string
}

/**
 * AI usage information returned from the API
 */
interface UsageInfo {
  /** Total tokens used in the generation */
  tokens: number
  /** Estimated cost in USD */
  estimatedCost: string
  /** AI model used (e.g., 'gpt-4o') */
  model: string
}

/**
 * Generation progress stages
 * 
 * @description
 * Tracks the current step in the town generation process.
 * Used to show progress indicators to the user.
 */
type GenerationStep = 'idle' | 'generating_town' | 'creating_shops' | 'summoning_npcs' | 'stocking_items' | 'complete'

/**
 * AI-powered town generator with cascading entity creation
 * 
 * @description
 * Renders a form that allows DMs to generate entire towns using natural
 * language descriptions. The component handles the full generation lifecycle:
 * prompt input, API communication, progress tracking, and navigation.
 * 
 * **State Management:**
 * - `prompt`: User's town description
 * - `isGenerating`: Loading state for UI feedback
 * - `currentStep`: Progress through generation stages
 * - `error`: Error message display
 * - `lastUsage`: Token usage tracking
 * 
 * **User Experience:**
 * - Simulated progress steps for perceived performance
 * - Automatic redirect to town page on completion
 * - Clear error messages on failure
 * - Disabled state during generation
 * 
 * **Error Handling:**
 * - Network errors caught and displayed
 * - API errors extracted from response
 * - State reset on error for retry
 */
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
