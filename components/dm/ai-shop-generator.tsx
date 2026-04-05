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

type GenerationStep = {
  label: string
  status: 'pending' | 'active' | 'complete'
}

export function AIShopGenerator({ campaignId, townId }: AIShopGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('A mysterious apothecary in a dark alley, run by a suspicious halfling')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [steps, setSteps] = useState<GenerationStep[]>([])
  const [showProgress, setShowProgress] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowProgress(true)

    // Initialize progress steps
    const progressSteps: GenerationStep[] = [
      { label: 'Consulting guild records...', status: 'pending' },
      { label: 'Designing shop layout...', status: 'pending' },
      { label: 'Hiring a shopkeeper...', status: 'pending' },
      { label: 'Stocking the shelves...', status: 'pending' },
      { label: 'Opening for business...', status: 'pending' },
    ]
    setSteps(progressSteps)

    // Simulate progress updates
    const updateStep = (index: number) => {
      setSteps(prev => prev.map((step, i) => ({
        ...step,
        status: i < index ? 'complete' : i === index ? 'active' : 'pending'
      })))
    }

    try {
      // Step 1: Consulting guild records
      updateStep(0)
      await new Promise(resolve => setTimeout(resolve, 800))

      // Step 2: Designing shop layout
      updateStep(1)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Step 3: Hiring shopkeeper
      updateStep(2)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 4: Stocking shelves (actual API call)
      updateStep(3)
      const response = await fetch('/api/dm/generate-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignId, 
          townId: townId || undefined,
          prompt 
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate shop')
      }

      // Step 5: Opening for business
      updateStep(4)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mark all complete
      setSteps(prev => prev.map(step => ({ ...step, status: 'complete' })))
      await new Promise(resolve => setTimeout(resolve, 300))

      // Redirect to the newly created shop
      router.push(`/dm/shops/${result.data.shopId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate shop')
      setLoading(false)
      setShowProgress(false)
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
        {!showProgress ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Shop Description</Label>
              <Input
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                disabled={loading}
                placeholder="e.g., A blacksmith in a dwarven mountain city"
              />
              <p className="text-xs text-on-surface-variant">
                Describe the shop type, location, and shopkeeper personality
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !prompt.trim()} className="w-full">
              {loading ? (
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
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-on-surface">Establishing Shop</h3>
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                  {step.status === 'complete' ? (
                    <Check className="w-4 h-4 text-gold flex-shrink-0" />
                  ) : step.status === 'active' ? (
                    <Loader2 className="w-4 h-4 text-gold animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-surface-container flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    step.status === 'complete' ? 'text-gold' : 
                    step.status === 'active' ? 'text-on-surface' : 
                    'text-on-surface-variant'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {steps.every(s => s.status === 'complete') && (
              <div className="p-3 bg-gold/10 border border-gold rounded-md">
                <p className="text-sm text-gold font-semibold">Shop Open for Business!</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Redirecting to your new shop...
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
