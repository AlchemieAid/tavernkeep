'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save, X } from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  description: string | null
  ruleset: string | null
  setting: string | null
  history: string | null
  currency: string | null
  pantheon: string | null
}

export default function EditCampaignPage({ params }: { params: { campaignId: string } }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ruleset: '5e',
    setting: '',
    history: '',
    currency: 'Gold Pieces (gp)',
    pantheon: '',
  })

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/dm/campaigns/${params.campaignId}`)
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to load campaign')
        }
        
        const data = result.data || result
        setCampaign(data)
        setFormData({
          name: data.name || '',
          description: data.description || '',
          ruleset: data.ruleset || '5e',
          setting: data.setting || '',
          history: data.history || '',
          currency: data.currency || 'Gold Pieces (gp)',
          pantheon: data.pantheon || '',
        })
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaign()
  }, [params.campaignId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/dm/campaigns/${params.campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update campaign')
      }

      router.push(`/dm/campaigns/${params.campaignId}`)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-500">Campaign not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="headline-lg text-on-surface">Edit Campaign</h1>
        <Button variant="outline" asChild>
          <Link href={`/dm/campaigns/${params.campaignId}`}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core campaign details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., The Cursed Kingdom"
                required
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief campaign overview..."
                rows={3}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>World Settings</CardTitle>
            <CardDescription>Define your campaign world</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ruleset">Ruleset</Label>
              <Input
                id="ruleset"
                value={formData.ruleset}
                onChange={(e) => setFormData({ ...formData, ruleset: e.target.value })}
                placeholder="e.g., 5e, Pathfinder, 3.5e"
                disabled={isSaving}
              />
              <p className="text-xs text-on-surface-variant">
                RPG system (5e, 4e, 3e, 2e, Pathfinder, Traveler, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setting">Setting / World</Label>
              <Input
                id="setting"
                value={formData.setting}
                onChange={(e) => setFormData({ ...formData, setting: e.target.value })}
                placeholder="e.g., Forgotten Realms, Eberron, Custom World"
                disabled={isSaving}
              />
              <p className="text-xs text-on-surface-variant">
                World or setting name and brief description
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency System</Label>
              <Input
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="e.g., Gold Pieces (gp), Silver Crowns"
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lore & History</CardTitle>
            <CardDescription>Rich background for your world</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="history">Campaign History</Label>
              <Textarea
                id="history"
                value={formData.history}
                onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                placeholder="Major historical events, past conflicts, legendary figures..."
                rows={4}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pantheon">Pantheon / Deities</Label>
              <Textarea
                id="pantheon"
                value={formData.pantheon}
                onChange={(e) => setFormData({ ...formData, pantheon: e.target.value })}
                placeholder="Major gods, religious systems, divine powers..."
                rows={4}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500">
            <CardContent className="py-4">
              <p className="text-sm text-red-500">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dm/campaigns/${params.campaignId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
