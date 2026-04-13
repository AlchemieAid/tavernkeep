'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Check, MapPin, Store, Users, Package } from 'lucide-react'

interface UsageInfo {
  tokens: number
  estimatedCost: string
  model: string
}

interface GenerationResults {
  campaign?: { id: string; name: string }
  towns?: Array<{ id: string; name: string }>
  shops?: Array<{ id: string; name: string }>
  notablePeople?: Array<{ id: string; name: string }>
  items?: Array<{ id: string; name: string }>
}

type GenerationStep = 
  | 'idle' 
  | 'validating' 
  | 'checking_rate_limit' 
  | 'generating_campaign'
  | 'generating_towns'
  | 'generating_shops'
  | 'generating_people'
  | 'generating_items'
  | 'complete'

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: 'Ready',
  validating: 'Validating Request',
  checking_rate_limit: 'Establishing connection...',
  generating_campaign: 'Creating Campaign World',
  generating_towns: 'Building Towns',
  generating_shops: 'Stocking Shops',
  generating_people: 'Creating Notable People',
  generating_items: 'Adding Items',
  complete: 'Complete'
}

const ESTIMATED_SECONDS = 30 // Cold start estimate

export function AICampaignGenerator() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null)
  const [connectionTimer, setConnectionTimer] = useState(ESTIMATED_SECONDS)
  const router = useRouter()

  const [results, setResults] = useState<GenerationResults | null>(null)

  // Countdown timer for connection phase
  useEffect(() => {
    if (currentStep === 'checking_rate_limit' && connectionTimer > 0) {
      const interval = setInterval(() => {
        setConnectionTimer((prev) => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
    if (currentStep !== 'checking_rate_limit' && connectionTimer !== ESTIMATED_SECONDS) {
      setConnectionTimer(ESTIMATED_SECONDS)
    }
  }, [currentStep, connectionTimer])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setResults(null)
    setCurrentStep('validating')

    try {
      setCurrentStep('checking_rate_limit')
      
      // Use new hierarchical generation API
      const response = await fetch('/api/dm/generate-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          // Default config - creates full hierarchy
        }),
      })

      setCurrentStep('generating_campaign')
      
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate campaign')
      }

      setCurrentStep('generating_towns')
      // Simulate progression for better UX (actual generation happens server-side)
      await new Promise(r => setTimeout(r, 500))
      
      setCurrentStep('generating_shops')
      await new Promise(r => setTimeout(r, 500))
      
      setCurrentStep('generating_people')
      await new Promise(r => setTimeout(r, 500))
      
      setCurrentStep('generating_items')
      await new Promise(r => setTimeout(r, 500))

      // Store results
      const generationResults: GenerationResults = {
        campaign: result.data?.campaign,
        towns: result.data?.towns,
        shops: result.data?.shops,
        notablePeople: result.data?.notablePeople,
        items: result.data?.items,
      }
      setResults(generationResults)

      setCurrentStep('complete')

      // Redirect to the new campaign after showing completion
      setTimeout(() => {
        if (generationResults.campaign) {
          router.push(`/dm/campaigns/${generationResults.campaign.id}`)
          router.refresh()
        }
      }, 2500)
    } catch (err) {
      console.error('Campaign generation error:', err)
      setError((err as Error).message)
      setIsGenerating(false)
      setCurrentStep('idle')
    }
  }

  return (
    <Card className="border-2 border-gold/20 shadow-lg">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 rounded-lg">
            <Sparkles className="w-6 h-6 text-gold" />
          </div>
          <div>
            <CardTitle className="text-2xl">AI World Generator</CardTitle>
            <CardDescription className="text-base mt-1">
              Describe your campaign idea and AI will create a complete world in seconds
            </CardDescription>
          </div>
        </div>
        
        {/* Feature badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full text-xs">
            <MapPin className="w-3.5 h-3.5 text-gold" />
            <span>2-4 Towns</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full text-xs">
            <Store className="w-3.5 h-3.5 text-gold" />
            <span>3-5 Shops per Town</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full text-xs">
            <Users className="w-3.5 h-3.5 text-gold" />
            <span>3-5 Notable People</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full text-xs">
            <Package className="w-3.5 h-3.5 text-gold" />
            <span>5-10 Items per Shop</span>
          </div>
        </div>
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
            <p className="text-sm font-semibold text-on-surface">Building Your World</p>
            <div className="space-y-2">
              {(['validating', 'checking_rate_limit', 'generating_campaign', 'generating_towns', 'generating_shops', 'generating_people', 'generating_items', 'complete'] as GenerationStep[]).map((step) => {
                const steps = ['validating', 'checking_rate_limit', 'generating_campaign', 'generating_towns', 'generating_shops', 'generating_people', 'generating_items', 'complete']
                const stepIndex = steps.indexOf(step)
                const currentIndex = steps.indexOf(currentStep)
                const isComplete = stepIndex < currentIndex || currentStep === 'complete'
                const isCurrent = step === currentStep
                
                const getStepIcon = () => {
                  if (isComplete) return <Check className="w-4 h-4 text-green-600" />
                  if (isCurrent) return <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  return <div className="w-4 h-4 rounded-full border-2 border-outline" />
                }
                
                return (
                  <div key={step} className="flex items-center gap-2 text-sm">
                    {getStepIcon()}
                    <span className={isCurrent ? 'font-semibold text-on-surface' : isComplete ? 'text-on-surface-variant' : 'text-outline'}>
                      {STEP_LABELS[step]}
                      {isCurrent && step === 'checking_rate_limit' && connectionTimer > 0 && (
                        <span className="ml-2 text-muted-foreground">({connectionTimer}s)</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {currentStep === 'complete' && results && (
          <div className="text-sm text-green-700 bg-green-50 p-4 rounded-md space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              World Created Successfully!
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {results.towns?.length || 0} Towns
              </div>
              <div className="flex items-center gap-1">
                <Store className="w-3 h-3" />
                {results.shops?.length || 0} Shops
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {results.notablePeople?.length || 0} Notable People
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {results.items?.length || 0} Items
              </div>
            </div>
            <p className="text-xs text-green-600">Redirecting to your new campaign...</p>
          </div>
        )}

        <Button 
          onClick={handleGenerate} 
          disabled={!prompt.trim() || isGenerating}
          className="w-full h-12 text-base"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Your World...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Complete World
            </>
          )}
        </Button>

        <p className="text-xs text-center text-on-surface-variant">
          All generated content is fully customizable after creation
        </p>
      </CardContent>
    </Card>
  )
}
