'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle2, Flag, Castle, Globe, LucideIcon, MapPin, Crown, Scroll, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'form' | 'generating' | 'success'

interface FormData {
  name: string
  description: string
  currency: string
  settingTheme: string
  mapSize: 'region' | 'kingdom' | 'continent' | ''
  mapStyle: string
  biomeProfile: string
  unitSystem: 'imperial' | 'metric'
}

interface GenerationStatus {
  stage: 'idle' | 'creating_campaign' | 'generating_maps' | 'finalizing' | 'complete' | 'error'
  message: string
  campaignCreated: boolean
  campaignName?: string
  campaignId?: string
  mapsGenerated: number
  mapsTotal: number
  error?: string
}

export function NewCampaignWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [progress, setProgress] = useState(0)
  const [data, setData] = useState<FormData>({ name: '', description: '', currency: '', settingTheme: '', mapSize: '', mapStyle: 'fantasy_painted', biomeProfile: 'temperate', unitSystem: 'imperial' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [genStatus, setGenStatus] = useState<GenerationStatus>({
    stage: 'idle',
    message: '',
    campaignCreated: false,
    mapsGenerated: 0,
    mapsTotal: 3
  })

  const updateData = useCallback((updates: Partial<FormData>) => setData(prev => ({ ...prev, ...updates })), [])

  const goToStep = (newStep: Step) => {
    const p: Record<Step, number> = { form: 0, generating: 50, success: 100 }
    setStep(newStep); setProgress(p[newStep]); setError(null)
  }

  const validateForm = (): boolean => {
    if (!data.settingTheme.trim()) { setError('Setting theme is required'); return false }
    if (!data.mapSize) { setError('Please select a map size'); return false }
    return true
  }

  const startGeneration = async () => {
    const startTime = Date.now()
    console.log('[WIZARD] Starting world generation at', new Date().toISOString())
    setIsSubmitting(true)
    goToStep('generating')
    
    // Reset generation status
    setGenStatus({
      stage: 'creating_campaign',
      message: 'Initializing AI...',
      campaignCreated: false,
      mapsGenerated: 0,
      mapsTotal: 3
    })

    try {
      // Step 1: Create Campaign with AI
      console.log('[WIZARD] Step 1: Creating campaign via AI generation')
      setGenStatus(prev => ({ ...prev, stage: 'creating_campaign', message: 'AI is writing your campaign lore...' }))
      
      const campaignPayload = {
        prompt: data.settingTheme,
        ruleset: '5e',
        setting: data.name || undefined // Pass undefined if empty, AI will generate
      }
      console.log('[WIZARD] Campaign payload:', campaignPayload)

      const campaignFetchStart = Date.now()
      const cRes = await fetch('/api/dm/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload),
        signal: AbortSignal.timeout(120000) // 2 minute timeout
      })
      const campaignFetchDuration = Date.now() - campaignFetchStart
      console.log('[WIZARD] Campaign fetch took', campaignFetchDuration, 'ms, status:', cRes.status)
      
      if (!cRes.ok) {
        const errorData = await cRes.json().catch(() => ({}))
        console.error('[WIZARD] Campaign API error:', errorData)
        throw new Error(errorData.error?.message || `Failed to create campaign (${cRes.status})`)
      }
      
      const campaignResult = await cRes.json()
      console.log('[WIZARD] Campaign created:', campaignResult)
      
      const campaign = campaignResult.data
      if (!campaign?.id) {
        throw new Error('Campaign was created but no ID was returned')
      }

      setGenStatus(prev => ({
        ...prev,
        stage: 'generating_maps',
        campaignCreated: true,
        campaignId: campaign.id,
        campaignName: campaign.name || data.name,
        message: 'Campaign created! Now generating map images...'
      }))

      // Step 2: Generate Map Images
      console.log('[WIZARD] Step 2: Generating map images for campaign:', campaign.id)
      const mapPayload = {
        campaign_id: campaign.id,
        map_size: data.mapSize,
        map_style: data.mapStyle,
        biome_profile: data.biomeProfile,
        dm_description: data.settingTheme
      }
      console.log('[WIZARD] Map payload:', mapPayload)

      const mapFetchStart = Date.now()
      const mRes = await fetch('/api/world/generate-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapPayload),
        signal: AbortSignal.timeout(180000) // 3 minute timeout for image generation
      })
      const mapFetchDuration = Date.now() - mapFetchStart
      console.log('[WIZARD] Map fetch took', mapFetchDuration, 'ms, status:', mRes.status)
      
      console.log('[WIZARD] Map API response status:', mRes.status)

      if (!mRes.ok) {
        const errorData = await mRes.json().catch(() => ({}))
        console.error('[WIZARD] Map API error:', errorData)
        throw new Error(errorData.error?.message || `Failed to generate map (${mRes.status})`)
      }

      const mapResult = await mRes.json()
      console.log('[WIZARD] Maps generated:', mapResult)
      
      const maps = mapResult.data
      if (!maps?.length) {
        throw new Error('No map images were generated')
      }

      setGenStatus(prev => ({
        ...prev,
        mapsGenerated: maps.length,
        message: `${maps.length} map images created! Finalizing...`
      }))

      // Step 3: Select the first map
      console.log('[WIZARD] Step 3: Selecting first map:', maps[0].id)
      setGenStatus(prev => ({ ...prev, stage: 'finalizing', message: 'Selecting your map and finalizing...' }))
      
      const selectFetchStart = Date.now()
      const selectRes = await fetch('/api/world/generate-maps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map_id: maps[0].id, campaign_id: campaign.id }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      const selectFetchDuration = Date.now() - selectFetchStart
      console.log('[WIZARD] Map selection fetch took', selectFetchDuration, 'ms, status:', selectRes.status)

      if (!selectRes.ok) {
        const errorData = await selectRes.json().catch(() => ({}))
        console.warn('[WIZARD] Map selection warning:', errorData)
        // Don't fail here - campaign and maps exist even if selection fails
      } else {
        console.log('[WIZARD] Map selected successfully')
      }

      // Success!
      setGenStatus(prev => ({ ...prev, stage: 'complete', message: 'World creation complete!' }))
      const totalDuration = Date.now() - startTime
      console.log('[WIZARD] Generation complete! Total duration:', totalDuration, 'ms')
      console.log('[WIZARD] Redirecting to campaign...')
      goToStep('success')
      
      setTimeout(() => {
        console.log('[WIZARD] Executing redirect to:', `/dm/campaigns/${campaign.id}/maps/${maps[0].id}`)
        router.push(`/dm/campaigns/${campaign.id}/maps/${maps[0].id}`)
      }, 2000)
      
    } catch (err) {
      const totalDuration = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      console.error('[WIZARD] Generation failed after', totalDuration, 'ms:', errorMessage, err)
      console.error('[WIZARD] Error details:', {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : 'No stack trace',
        name: err instanceof Error ? err.name : 'Unknown error type'
      })
      setGenStatus(prev => ({ ...prev, stage: 'error', error: errorMessage }))
      setIsSubmitting(false)
      goToStep('form')
      setError(errorMessage) // Must be AFTER goToStep — goToStep clears error state
    }
  }

  const handleGenerate = async () => {
    if (!validateForm()) return
    await startGeneration()
  }

  return (
    <div className="min-h-screen bg-[#0c0e11] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20"><Sparkles className="w-6 h-6 text-primary" /></div>
            <div><h1 className="font-noto-serif text-3xl font-semibold text-on-surface">Forge a New World</h1><p className="text-on-surface-variant font-manrope text-sm">Create your campaign and generate its first map</p></div>
          </div>
          {step !== 'form' && <div className="h-2 bg-[#1a1c1f] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300" style={{ width: `${progress}%` }} /></div>}
        </div>
        {error && <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-rose-400 shrink-0" /><p className="text-sm text-rose-300">{error}</p></div>}
        <Card className="bg-[#141619] border-[#282a2d]">
          <CardHeader><CardTitle className="font-noto-serif text-xl">{step === 'form' ? 'Campaign Configuration' : step === 'generating' ? 'Creating Your World...' : 'World Created!'}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {step === 'form' && <div className="space-y-6">
              {/* Required fields at top */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Setting Theme *</Label>
                  <Textarea value={data.settingTheme} onChange={e => updateData({ settingTheme: e.target.value })} placeholder="Coastal merchant republic with smuggling guilds..." className="bg-[#1a1c1f] border-[#282a2d] min-h-[100px]" />
                </div>
                <div className="space-y-3">
                  <Label>Map Size *</Label>
                  {([['region', 'Region', '50-100', '80-160', Flag, 'A county or small province'], ['kingdom', 'Kingdom', '200-400', '320-640', Castle, 'A full nation with multiple cities'], ['continent', 'Continent', '1000-2000', '1600-3200', Globe, 'A vast landmass with diverse biomes']] as [string, string, string, string, LucideIcon, string][]).map(([val, label, mi, km, IconComp, desc]) => {
                    const isSel = data.mapSize === val
                    return <button key={val} onClick={() => updateData({ mapSize: val as any })} className={cn('w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left', isSel ? 'border-primary bg-primary/5' : 'border-[#282a2d] bg-[#1a1c1f]')}><div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', isSel ? 'bg-primary/20' : 'bg-[#282a2d]')}><IconComp className={cn('w-6 h-6', isSel ? 'text-primary' : 'text-on-surface-variant')} /></div><div className="flex-1"><h3 className={cn('font-semibold', isSel ? 'text-primary' : 'text-on-surface')}>{label}</h3><p className="text-sm text-on-surface-variant">{desc}</p><p className="text-xs text-on-surface-variant/60 mt-1">{data.unitSystem === 'metric' ? km + ' km' : mi + ' miles'}</p></div>{isSel && <CheckCircle2 className="w-5 h-5 text-primary" />}</button>
                  })}
                  <div className="flex items-center gap-2"><Label className="text-xs">Units:</Label><div className="flex bg-[#1a1c1f] rounded-lg p-0.5"><button onClick={() => updateData({ unitSystem: 'imperial' })} className={cn('px-3 py-1 text-xs rounded-md', data.unitSystem === 'imperial' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant')}>Miles</button><button onClick={() => updateData({ unitSystem: 'metric' })} className={cn('px-3 py-1 text-xs rounded-md', data.unitSystem === 'metric' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant')}>km</button></div></div>
                </div>
              </div>

              {/* Optional fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Name <span className="text-on-surface-variant/60 font-normal">(optional - AI will generate if empty)</span></Label>
                  <Input value={data.name} onChange={e => updateData({ name: e.target.value })} placeholder="Leave empty for AI-generated name" className="bg-[#1a1c1f] border-[#282a2d]" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={data.description} onChange={e => updateData({ description: e.target.value })} placeholder="Brief overview..." className="bg-[#1a1c1f] border-[#282a2d] min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label>Currency <span className="text-on-surface-variant/60 font-normal">(optional - leave empty for multi-currency system)</span></Label>
                  <Input value={data.currency} onChange={e => updateData({ currency: e.target.value })} placeholder="e.g., 'Gold Pieces (gp)' or leave empty" className="bg-[#1a1c1f] border-[#282a2d]" />
                  <p className="text-xs text-on-surface-variant/50">If empty, AI will create a thematic multi-currency system</p>
                </div>
                <div className="space-y-2">
                  <Label>Map Style</Label>
                  <Select value={data.mapStyle} onValueChange={v => updateData({ mapStyle: v })}><SelectTrigger className="bg-[#1a1c1f] border-[#282a2d]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1a1c1f] border-[#282a2d]"><SelectItem value="fantasy_painted">Fantasy Painted</SelectItem><SelectItem value="parchment">Aged Parchment</SelectItem><SelectItem value="topographic">Topographic</SelectItem><SelectItem value="hand_drawn">Hand Drawn (Ink)</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Biome Profile</Label>
                  <Select value={data.biomeProfile} onValueChange={v => updateData({ biomeProfile: v })}><SelectTrigger className="bg-[#1a1c1f] border-[#282a2d]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1a1c1f] border-[#282a2d]"><SelectItem value="temperate">Temperate (forests, grasslands)</SelectItem><SelectItem value="tropical">Tropical (jungles, beaches)</SelectItem><SelectItem value="arid">Arid (deserts, wastelands)</SelectItem><SelectItem value="arctic">Arctic (tundra, glaciers)</SelectItem><SelectItem value="archipelago">Archipelago (islands, coastal)</SelectItem><SelectItem value="volcanic">Volcanic (mountains, magma)</SelectItem></SelectContent></Select>
                </div>
              </div>
            </div>}
            {step === 'generating' && (
              <div className="space-y-6">
                {/* Main Progress */}
                <div className="text-center py-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-on-surface font-manrope text-lg font-medium">{genStatus.message}</p>
                  <p className="text-sm text-on-surface-variant mt-1">This may take 30-60 seconds</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-[#1a1c1f] rounded-full h-3 overflow-hidden border border-[#282a2d]">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-700 ease-out"
                      style={{ 
                        width: `${genStatus.stage === 'creating_campaign' ? 25 : genStatus.stage === 'generating_maps' ? 50 : genStatus.stage === 'finalizing' ? 85 : genStatus.stage === 'complete' ? 100 : 10}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Campaign</span>
                    <span>Maps</span>
                    <span>Finalize</span>
                  </div>
                </div>

                {/* Status Boxes Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Campaign Box */}
                  <div className={cn(
                    'p-3 rounded-xl border-2 transition-all duration-300',
                    genStatus.campaignCreated 
                      ? 'bg-amber-500/10 border-amber-500/50' 
                      : genStatus.stage === 'creating_campaign'
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-[#1a1c1f] border-[#282a2d]'
                  )}>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Scroll className={cn(
                        'w-4 h-4',
                        genStatus.campaignCreated ? 'text-amber-500' : 'text-on-surface-variant'
                      )} />
                      <span className={genStatus.campaignCreated ? 'text-amber-500' : 'text-on-surface-variant'}>
                        Campaign
                      </span>
                      {genStatus.campaignCreated && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                    </div>
                    <div className="text-xs">
                      {genStatus.campaignCreated ? (
                        <div className="space-y-1">
                          <span className="text-amber-600 font-medium block truncate" title={genStatus.campaignName}>
                            {genStatus.campaignName}
                          </span>
                          <span className="text-on-surface-variant/70 text-[10px] font-mono">
                            ID: {genStatus.campaignId?.slice(0, 8)}...
                          </span>
                        </div>
                      ) : genStatus.stage === 'creating_campaign' ? (
                        <span className="text-amber-500/80">AI is writing your lore...</span>
                      ) : (
                        <span className="text-on-surface-variant/50">Waiting...</span>
                      )}
                    </div>
                  </div>

                  {/* Maps Box */}
                  <div className={cn(
                    'p-3 rounded-xl border-2 transition-all duration-300',
                    genStatus.mapsGenerated > 0
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : genStatus.stage === 'generating_maps'
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-[#1a1c1f] border-[#282a2d]'
                  )}>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <MapPin className={cn(
                        'w-4 h-4',
                        genStatus.mapsGenerated > 0 ? 'text-emerald-500' : 'text-on-surface-variant'
                      )} />
                      <span className={genStatus.mapsGenerated > 0 ? 'text-emerald-500' : 'text-on-surface-variant'}>
                        Maps ({genStatus.mapsGenerated}/{genStatus.mapsTotal})
                      </span>
                      {genStatus.mapsGenerated > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                    </div>
                    <div className="text-xs">
                      {genStatus.mapsGenerated > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          {genStatus.mapsGenerated} image{genStatus.mapsGenerated !== 1 ? 's' : ''} generated
                        </span>
                      ) : genStatus.stage === 'generating_maps' ? (
                        <span className="text-emerald-500/80 animate-pulse-slow">AI is drawing your maps...</span>
                      ) : (
                        <span className="text-on-surface-variant/50">Waiting...</span>
                      )}
                    </div>
                  </div>

                  {/* AI Provider Box */}
                  <div className={cn(
                    'p-3 rounded-xl border-2 transition-all duration-300',
                    genStatus.stage === 'creating_campaign' || genStatus.stage === 'generating_maps'
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-[#1a1c1f] border-[#282a2d]'
                  )}>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Wand2 className={cn(
                        'w-4 h-4',
                        genStatus.stage === 'creating_campaign' || genStatus.stage === 'generating_maps'
                          ? 'text-purple-500'
                          : 'text-on-surface-variant'
                      )} />
                      <span className={
                        genStatus.stage === 'creating_campaign' || genStatus.stage === 'generating_maps'
                          ? 'text-purple-500'
                          : 'text-on-surface-variant'
                      }>
                        AI Services
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          genStatus.stage === 'creating_campaign' ? 'bg-blue-500 animate-pulse-slow' : genStatus.campaignCreated ? 'bg-emerald-500' : 'bg-muted'
                        )} />
                        <span className="text-on-surface-variant">Campaign: {genStatus.campaignCreated ? 'AI ✓' : genStatus.stage === 'creating_campaign' ? 'Working...' : 'Queued'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          genStatus.stage === 'generating_maps' ? 'bg-purple-500 animate-pulse-slow' : genStatus.mapsGenerated > 0 ? 'bg-emerald-500' : 'bg-muted'
                        )} />
                        <span className="text-on-surface-variant">Maps: {genStatus.mapsGenerated > 0 ? `AI ✓ (${genStatus.mapsGenerated})` : genStatus.stage === 'generating_maps' ? 'Generating...' : 'Queued'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Finalize Box */}
                  <div className={cn(
                    'p-3 rounded-xl border-2 transition-all duration-300',
                    genStatus.stage === 'finalizing'
                      ? 'bg-blue-500/10 border-blue-500/30 animate-pulse-slow'
                      : genStatus.stage === 'complete'
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-[#1a1c1f] border-[#282a2d]'
                  )}>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Crown className={cn(
                        'w-4 h-4',
                        genStatus.stage === 'finalizing' || genStatus.stage === 'complete' ? 'text-blue-500' : 'text-on-surface-variant'
                      )} />
                      <span className={genStatus.stage === 'finalizing' || genStatus.stage === 'complete' ? 'text-blue-500' : 'text-on-surface-variant'}>
                        Finalize
                      </span>
                      {genStatus.stage === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                    </div>
                    <div className="text-xs">
                      {genStatus.stage === 'finalizing' ? (
                        <span className="text-blue-500/80 animate-pulse-slow">Selecting map & saving...</span>
                      ) : genStatus.stage === 'complete' ? (
                        <span className="text-blue-600 font-medium">Ready!</span>
                      ) : (
                        <span className="text-on-surface-variant/50">Waiting...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Debug Info for Developer */}
                <div className="p-3 rounded-lg bg-[#1a1c1f] border border-[#282a2d]">
                  <p className="text-[10px] text-on-surface-variant/50 font-mono uppercase tracking-wider mb-2">Debug Info</p>
                  <div className="text-[10px] font-mono text-on-surface-variant/70 space-y-0.5">
                    <div>Stage: {genStatus.stage}</div>
                    <div>Campaign ID: {genStatus.campaignId || 'N/A'}</div>
                    <div>Maps: {genStatus.mapsGenerated} generated</div>
                    <div>Status: {genStatus.message}</div>
                  </div>
                </div>
              </div>
            )}
            {step === 'success' && <div className="py-12 text-center"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" /><p className="text-on-surface font-manrope text-lg">Your campaign is ready!</p><p className="text-sm text-on-surface-variant mt-2">Redirecting to map setup...</p></div>}
            {step === 'form' && <div className="flex justify-end pt-4"><Button onClick={handleGenerate} disabled={isSubmitting}><Sparkles className="w-4 h-4 mr-2" />Create World</Button></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
