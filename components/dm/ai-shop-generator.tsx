/**
 * AI Shop Generator Component
 * 
 * @fileoverview
 * Provides a UI for DMs to generate shops using AI. Takes a natural language
 * prompt and creates a shop with a shopkeeper and stocked items. Can be used
 * standalone or within a town context.
 * 
 * @component
 * **Generation Flow:**
 * ```
 * 1. User enters shop description
 * 2. Generating shop → Creates shop entity + shopkeeper
 * 3. Stocking items → Populates inventory from library/catalog
 * 4. Complete → Redirects to shop detail page
 * ```
 * 
 * @features
 * - Natural language input (e.g., "A mysterious apothecary")
 * - Automatic shopkeeper creation
 * - Item population from DM's library or SRD catalog
 * - Progress indicators
 * - Works with or without town context
 * 
 * @example
 * ```tsx
 * // Shop within a town
 * <AIShopGenerator campaignId={campaign.id} townId={town.id} />
 * 
 * // Standalone shop
 * <AIShopGenerator campaignId={campaign.id} townId={null} />
 * ```
 * 
 * @see {@link GenerationOrchestrator.generateShop} for backend logic
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Check, Sparkles } from 'lucide-react'

/**
 * Props for the AIShopGenerator component
 */
interface AIShopGeneratorProps {
  /** Campaign ID to generate the shop for */
  campaignId: string
  /** Optional town ID (null for standalone shops) */
  townId?: string
}

/**
 * Generation progress stages for shop creation
 */
type GenerationStep = 'idle' | 'generating_shop' | 'creating_shopkeeper' | 'stocking_items' | 'complete'

/**
 * AI-powered shop generator with automatic inventory
 * 
 * @description
 * Renders a form for generating shops via AI. Handles both town-based
 * and standalone shops. Automatically creates a shopkeeper and populates
 * inventory from the DM's item library or SRD catalog.
 * 
 * **State Management:**
 * - `prompt`: Shop description from user
 * - `isGenerating`: Loading state
 * - `currentStep`: Progress tracking
 * - `error`: Error display
 * 
 * **Item Population:**
 * 1. Tries DM's personal item library first
 * 2. Falls back to SRD catalog if library is empty
 * 3. Matches items to shop type and economic tier
 */
export function AIShopGenerator({ campaignId, townId }: AIShopGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('A mysterious apothecary in a dark alley, run by a suspicious halfling')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle')

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setCurrentStep('generating_shop')

    try {
      // Simulate progress steps
      setTimeout(() => setCurrentStep('creating_shopkeeper'), 1000)
      setTimeout(() => setCurrentStep('stocking_items'), 2000)

      const response = await fetch('/api/dm/generate-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, townId, prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate shop')
      }

      setCurrentStep('complete')

      // Redirect to the new shop after a brief delay to show completion
      setTimeout(() => {
        if (data.data?.shopId) {
          router.push(`/dm/shops/${data.data.shopId}`)
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
          AI Shop Generator
        </CardTitle>
        <CardDescription>
          Describe a shop and let AI generate it with items automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isGenerating ? (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Shop Description</Label>
              <Input
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                disabled={isGenerating}
                placeholder="e.g., A blacksmith in a dwarven mountain city"
              />
              <p className="text-xs text-on-surface-variant">
                Creates a complete shop with shopkeeper and 5-10 items from your library or catalog. All context-aware and customizable.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Shop with AI
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="bg-surface-container p-4 rounded-md space-y-2">
            <p className="text-sm font-semibold text-on-surface">Creating Your Shop</p>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-sm ${currentStep !== 'idle' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep !== 'idle' && currentStep !== 'generating_shop' ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Generating shop with AI...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'creating_shopkeeper' || currentStep === 'stocking_items' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep === 'stocking_items' || currentStep === 'complete' ? <Check className="w-4 h-4" /> : currentStep === 'creating_shopkeeper' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Creating shopkeeper...</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${currentStep === 'stocking_items' || currentStep === 'complete' ? 'text-gold' : 'text-on-surface-variant'}`}>
                {currentStep === 'complete' ? <Check className="w-4 h-4" /> : currentStep === 'stocking_items' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                <span>Stocking shop with items...</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md space-y-1 mt-4">
            <p className="font-semibold">Shop Created Successfully!</p>
            <p className="text-xs">Complete with shopkeeper and 5-10 items</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
