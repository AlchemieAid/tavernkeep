'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Check, Sparkles } from 'lucide-react'

interface AIShopGeneratorProps {
  campaignId: string
  townId?: string
}

type GenerationStep = 'idle' | 'generating_shop' | 'creating_shopkeeper' | 'stocking_items' | 'complete'

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
