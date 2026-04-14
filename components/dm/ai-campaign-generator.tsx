'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, MapPin, Store, Users, Package, Globe, TreePine, Crown } from 'lucide-react'

interface CreatedEntity {
  id: string
  name: string
  type: 'campaign' | 'town' | 'shop' | 'notable_person' | 'item'
  parentId?: string
}

interface GenerationState {
  status: 'idle' | 'connecting' | 'generating' | 'complete' | 'error'
  currentStep: string
  progress: { current: number; total: number }
  entities: CreatedEntity[]
  message: string
}

export function AICampaignGenerator() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    currentStep: '',
    progress: { current: 0, total: 15 },
    entities: [],
    message: ''
  })
  const router = useRouter()

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setState({
      status: 'connecting',
      currentStep: 'Connecting...',
      progress: { current: 0, total: 15 },
      entities: [],
      message: 'Initializing world seed...'
    })

    try {
      const response = await fetch('/api/dm/generate-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error('Failed to start generation')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          const eventMatch = line.match(/^event: (\w+)$/m)
          const dataMatch = line.match(/^data: (.+)$/m)

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1]
            const data = JSON.parse(dataMatch[1])

            switch (eventType) {
              case 'connected':
                setState(s => ({ ...s, status: 'generating', message: 'World seed planted...' }))
                break

              case 'step':
                setState(s => ({
                  ...s,
                  currentStep: data.step,
                  progress: data.progress || s.progress,
                  message: data.details || `Creating ${data.step}...`
                }))
                break

              case 'entity':
                setState(s => ({
                  ...s,
                  entities: [...s.entities, { ...data.data, type: data.type }]
                }))
                break

              case 'progress':
                setState(s => ({
                  ...s,
                  progress: { current: data.current, total: data.total },
                  message: data.message
                }))
                break

              case 'complete':
                setState(s => ({ ...s, status: 'complete', message: 'World complete!' }))
                setTimeout(() => {
                  if (data.results?.campaign?.id) {
                    router.push(`/dm/campaigns/${data.results.campaign.id}`)
                    router.refresh()
                  }
                }, 2000)
                break

              case 'error':
                setState(s => ({ ...s, status: 'error', message: data.message }))
                setIsGenerating(false)
                break
            }
          }
        }
      }
    } catch (err) {
      console.error('Generation error:', err)
      setState(s => ({ ...s, status: 'error', message: (err as Error).message }))
      setIsGenerating(false)
    }
  }, [prompt, router])

  // Group entities by type
  const campaigns = state.entities.filter(e => e.type === 'campaign')
  const towns = state.entities.filter(e => e.type === 'town')
  const shops = state.entities.filter(e => e.type === 'shop')
  const people = state.entities.filter(e => e.type === 'notable_person')
  const items = state.entities.filter(e => e.type === 'item')

  const getProgressPercent = () => {
    const { current, total } = state.progress
    return Math.min(Math.round((current / total) * 100), 100)
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
              Describe your campaign idea and watch your world come to life in real-time
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

        {/* Progress Display with Colored Boxes */}
        {(state.status === 'connecting' || state.status === 'generating') && (
          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-on-surface">{state.message}</span>
                <span className="text-muted-foreground">{getProgressPercent()}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold to-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${getProgressPercent()}%` }}
                />
              </div>
            </div>

            {/* Entity Boxes Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Campaign */}
              <div className={`p-2 rounded-lg border transition-all ${campaigns.length > 0 ? 'bg-gold/10 border-gold/30' : 'bg-muted/50 border-muted'}`}>
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                  <Globe className="w-3 h-3 text-gold" />
                  Campaign
                </div>
                <div className="text-xs text-muted-foreground">
                  {campaigns.length > 0 ? (
                    <span className="text-primary font-medium truncate block" title={campaigns[0].name}>
                      {campaigns[0].name}
                    </span>
                  ) : (
                    <span className="animate-pulse">Creating...</span>
                  )}
                </div>
              </div>

              {/* Towns */}
              <div className={`p-2 rounded-lg border transition-all ${towns.length > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/50 border-muted'}`}>
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                  <TreePine className="w-3 h-3 text-emerald-500" />
                  Towns
                </div>
                <div className="text-xs text-muted-foreground">
                  {towns.length > 0 ? (
                    <div className="space-y-0.5 max-h-12 overflow-hidden">
                      {towns.slice(-2).map(t => (
                        <div key={t.id} className="text-emerald-600 truncate" title={t.name}>• {t.name}</div>
                      ))}
                      {towns.length > 2 && <div className="text-muted-foreground">+{towns.length - 2} more</div>}
                    </div>
                  ) : (
                    <span className={state.currentStep.includes('town') ? 'animate-pulse' : ''}>
                      {state.currentStep.includes('town') ? 'Building...' : 'Waiting...'}
                    </span>
                  )}
                </div>
              </div>

              {/* Shops */}
              <div className={`p-2 rounded-lg border transition-all ${shops.length > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/50 border-muted'}`}>
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                  <Store className="w-3 h-3 text-amber-500" />
                  Shops
                </div>
                <div className="text-xs text-muted-foreground">
                  {shops.length > 0 ? (
                    <div className="space-y-0.5 max-h-12 overflow-hidden">
                      {shops.slice(-2).map(s => (
                        <div key={s.id} className="text-amber-600 truncate" title={s.name}>• {s.name}</div>
                      ))}
                      {shops.length > 2 && <div className="text-muted-foreground">+{shops.length - 2} more</div>}
                    </div>
                  ) : (
                    <span className={state.currentStep.includes('shop') ? 'animate-pulse' : ''}>
                      {state.currentStep.includes('shop') ? 'Stocking...' : 'Waiting...'}
                    </span>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className={`p-2 rounded-lg border transition-all ${items.length > 0 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-muted/50 border-muted'}`}>
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                  <Package className="w-3 h-3 text-purple-500" />
                  Items
                </div>
                <div className="text-xs text-muted-foreground">
                  {items.length > 0 ? (
                    <div className="space-y-0.5">
                      <div className="text-purple-600 font-medium">{items.length} created</div>
                      <div className="text-muted-foreground truncate" title={items[items.length - 1]?.name}>
                        Latest: {items[items.length - 1]?.name}
                      </div>
                    </div>
                  ) : (
                    <span className={state.currentStep.includes('item') ? 'animate-pulse' : ''}>
                      {state.currentStep.includes('item') ? 'Forging...' : 'Waiting...'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notable People mini-list */}
            {people.length > 0 && (
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                  <Crown className="w-3 h-3 text-blue-500" />
                  Notable People ({people.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {people.map(p => (
                    <span key={p.id} className="text-xs bg-background/50 px-1.5 py-0.5 rounded text-blue-700 truncate max-w-[100px]" title={p.name}>
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {state.status === 'error' && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <p className="font-semibold">Generation Failed</p>
            <p>{state.message}</p>
          </div>
        )}

        {/* Success State */}
        {state.status === 'complete' && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
            <Sparkles className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-800">World Created!</p>
            <p className="text-sm text-green-600">
              {towns.length} towns, {shops.length} shops, {people.length} people, {items.length} items
            </p>
            <p className="text-xs text-green-500 mt-1">Redirecting to your campaign...</p>
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
              Building World...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Complete World
            </>
          )}
        </Button>

        {!isGenerating && (
          <p className="text-xs text-center text-muted-foreground">
            Creates a full hierarchy with real-time progress. Watch as towns, shops, people, and items appear live.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
