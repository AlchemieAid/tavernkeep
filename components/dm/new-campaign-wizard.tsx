'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle2, Flag, Castle, Globe, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'basics' | 'setting' | 'map' | 'generating' | 'success'

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

export function NewCampaignWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('basics')
  const [progress, setProgress] = useState(25)
  const [data, setData] = useState<FormData>({ name: '', description: '', currency: 'gp', settingTheme: '', mapSize: '', mapStyle: 'fantasy_illustrated', biomeProfile: 'temperate', unitSystem: 'imperial' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateData = useCallback((updates: Partial<FormData>) => setData(prev => ({ ...prev, ...updates })), [])

  const goToStep = (newStep: Step) => {
    const p: Record<Step, number> = { basics: 25, setting: 50, map: 75, generating: 90, success: 100 }
    setStep(newStep); setProgress(p[newStep]); setError(null)
  }

  const validateStep = (): boolean => {
    if (step === 'basics' && !data.name.trim()) { setError('Campaign name is required'); return false }
    if (step === 'setting' && !data.settingTheme.trim()) { setError('Setting theme is required'); return false }
    if (step === 'map' && !data.mapSize) { setError('Please select a map size'); return false }
    return true
  }

  const handleGenerate = async () => {
    setIsSubmitting(true); goToStep('generating')
    try {
      const cRes = await fetch('/api/dm/generate-campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: data.settingTheme, ruleset: '5e', setting: data.name }) })
      if (!cRes.ok) throw new Error('Failed to create campaign')
      const { data: campaign } = await cRes.json()
      const mRes = await fetch('/api/world/generate-maps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign_id: campaign.id, map_size: data.mapSize, map_style: data.mapStyle, biome_profile: data.biomeProfile, dm_description: data.settingTheme }) })
      if (!mRes.ok) throw new Error('Failed to generate map')
      const { data: maps } = await mRes.json()
      if (maps?.[0]) { await fetch('/api/world/generate-maps', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ map_id: maps[0].id, campaign_id: campaign.id }) }); goToStep('success'); setTimeout(() => router.push(`/dm/campaigns/${campaign.id}/maps/${maps[0].id}`), 1500) }
    } catch (err) { setError(err instanceof Error ? err.message : 'An error occurred'); setIsSubmitting(false); goToStep('map') }
  }

  const handleNext = () => { if (!validateStep()) return; if (step === 'basics') goToStep('setting'); else if (step === 'setting') goToStep('map'); else if (step === 'map') handleGenerate() }
  const handleBack = () => { if (step === 'setting') goToStep('basics'); else if (step === 'map') goToStep('setting') }

  return (
    <div className="min-h-screen bg-[#0c0e11] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20"><Sparkles className="w-6 h-6 text-primary" /></div>
            <div><h1 className="font-noto-serif text-3xl font-semibold text-on-surface">Forge a New World</h1><p className="text-on-surface-variant font-manrope text-sm">Create your campaign and generate its first map</p></div>
          </div>
          <div className="h-2 bg-[#1a1c1f] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
        {error && <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-rose-400 shrink-0" /><p className="text-sm text-rose-300">{error}</p></div>}
        <Card className="bg-[#141619] border-[#282a2d]">
          <CardHeader><CardTitle className="font-noto-serif text-xl">{step === 'basics' ? 'Campaign Basics' : step === 'setting' ? 'Setting & Theme' : step === 'map' ? 'Map Configuration' : step === 'generating' ? 'Creating Your World...' : 'World Created!'}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {step === 'basics' && <div className="space-y-4"><div className="space-y-2"><Label>Campaign Name *</Label><Input value={data.name} onChange={e => updateData({ name: e.target.value })} placeholder="The Lost Mines..." className="bg-[#1a1c1f] border-[#282a2d]" /></div><div className="space-y-2"><Label>Description</Label><Textarea value={data.description} onChange={e => updateData({ description: e.target.value })} placeholder="Brief overview..." className="bg-[#1a1c1f] border-[#282a2d] min-h-[80px]" /></div><div className="space-y-2"><Label>Currency</Label><Select value={data.currency} onValueChange={v => updateData({ currency: v })}><SelectTrigger className="bg-[#1a1c1f] border-[#282a2d]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1a1c1f] border-[#282a2d]"><SelectItem value="gp">Gold Pieces (gp)</SelectItem><SelectItem value="sp">Silver Pieces (sp)</SelectItem><SelectItem value="cp">Copper Pieces (cp)</SelectItem><SelectItem value="sh">Shillings</SelectItem></SelectContent></Select></div></div>}
            {step === 'setting' && <div className="space-y-4"><div className="space-y-2"><Label>Setting Theme *</Label><Textarea value={data.settingTheme} onChange={e => updateData({ settingTheme: e.target.value })} placeholder="Coastal merchant republic with smuggling guilds..." className="bg-[#1a1c1f] border-[#282a2d] min-h-[100px]" /></div><div className="space-y-2"><Label>Campaign Tone</Label><Select value={data.mapStyle} onValueChange={v => updateData({ mapStyle: v })}><SelectTrigger className="bg-[#1a1c1f] border-[#282a2d]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1a1c1f] border-[#282a2d]"><SelectItem value="fantasy_illustrated">Fantasy Illustrated</SelectItem><SelectItem value="aged_parchment">Aged Parchment</SelectItem><SelectItem value="satellite">Satellite View</SelectItem><SelectItem value="ink_drawn">Ink Drawn</SelectItem></SelectContent></Select></div></div>}
            {step === 'map' && <div className="space-y-4">
              <div className="space-y-3"><Label>Map Size *</Label>
                {([['region', 'Region', '50-100', '80-160', Flag, 'A county or small province'], ['kingdom', 'Kingdom', '200-400', '320-640', Castle, 'A full nation with multiple cities'], ['continent', 'Continent', '1000-2000', '1600-3200', Globe, 'A vast landmass with diverse biomes']] as [string, string, string, string, LucideIcon, string][]).map(([val, label, mi, km, IconComp, desc]) => {
                  const isSel = data.mapSize === val
                  return <button key={val} onClick={() => updateData({ mapSize: val as any })} className={cn('w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left', isSel ? 'border-primary bg-primary/5' : 'border-[#282a2d] bg-[#1a1c1f]')}><div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', isSel ? 'bg-primary/20' : 'bg-[#282a2d]')}><IconComp className={cn('w-6 h-6', isSel ? 'text-primary' : 'text-on-surface-variant')} /></div><div className="flex-1"><h3 className={cn('font-semibold', isSel ? 'text-primary' : 'text-on-surface')}>{label}</h3><p className="text-sm text-on-surface-variant">{desc}</p><p className="text-xs text-on-surface-variant/60 mt-1">{data.unitSystem === 'metric' ? km + ' km' : mi + ' miles'}</p></div>{isSel && <CheckCircle2 className="w-5 h-5 text-primary" />}</button>
                })}
                <div className="flex items-center gap-2"><Label className="text-xs">Units:</Label><div className="flex bg-[#1a1c1f] rounded-lg p-0.5"><button onClick={() => updateData({ unitSystem: 'imperial' })} className={cn('px-3 py-1 text-xs rounded-md', data.unitSystem === 'imperial' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant')}>Miles</button><button onClick={() => updateData({ unitSystem: 'metric' })} className={cn('px-3 py-1 text-xs rounded-md', data.unitSystem === 'metric' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant')}>km</button></div></div>
              </div>
              <div className="space-y-2"><Label>Biome Profile</Label><Select value={data.biomeProfile} onValueChange={v => updateData({ biomeProfile: v })}><SelectTrigger className="bg-[#1a1c1f] border-[#282a2d]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1a1c1f] border-[#282a2d]"><SelectItem value="temperate">Temperate (forests, grasslands)</SelectItem><SelectItem value="coastal">Coastal (oceans, ports)</SelectItem><SelectItem value="mountainous">Mountainous (peaks, valleys)</SelectItem><SelectItem value="desert">Desert (wastelands, oases)</SelectItem><SelectItem value="tropical">Tropical (jungles, beaches)</SelectItem><SelectItem value="arctic">Arctic (tundra, glaciers)</SelectItem><SelectItem value="varied">Varied/Mixed</SelectItem></SelectContent></Select></div>
            </div>}
            {step === 'generating' && <div className="py-12 text-center"><Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" /><p className="text-on-surface font-manrope">AI is crafting your world...</p><p className="text-sm text-on-surface-variant mt-2">This may take 30-60 seconds</p></div>}
            {step === 'success' && <div className="py-12 text-center"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" /><p className="text-on-surface font-manrope text-lg">Your campaign is ready!</p><p className="text-sm text-on-surface-variant mt-2">Redirecting to map setup...</p></div>}
            {step !== 'generating' && step !== 'success' && <div className="flex justify-between pt-4"><Button variant="outline" onClick={handleBack} disabled={step === 'basics'}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button><Button onClick={handleNext} disabled={isSubmitting}>{step === 'map' ? <><Sparkles className="w-4 h-4 mr-2" />Create World</> : <><ChevronRight className="w-4 h-4 mr-2" />Next</>}</Button></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
