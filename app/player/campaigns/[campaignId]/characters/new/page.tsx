'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { characterSchema } from '@/lib/validators/character'

interface NewCharacterPageProps {
  params: {
    campaignId: string
  }
}

export default function NewCharacterPage({ params }: NewCharacterPageProps) {
  const router = useRouter()
  const [characterName, setCharacterName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<any>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // Get current user and player
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/player/login')
        return
      }

      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!player) {
        router.push('/player/profile/create')
        return
      }

      setPlayerId(player.id)

      // Get campaign details
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('id, name, description')
        .eq('id', params.campaignId)
        .single()

      if (campaignData) {
        setCampaign(campaignData)
      }
    }

    loadData()
  }, [params.campaignId, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId) return

    setLoading(true)
    setError(null)

    try {
      // Validate input
      const validatedData = characterSchema.parse({
        player_id: playerId,
        campaign_id: params.campaignId,
        name: characterName,
      })

      // Create character
      const { error: insertError } = await supabase
        .from('characters')
        .insert(validatedData)

      if (insertError) throw insertError

      // Redirect to campaign view
      router.push(`/player/campaigns/${params.campaignId}`)
    } catch (err: any) {
      if (err.message?.includes('duplicate key')) {
        setError('You already have a character with this name in this campaign')
      } else {
        setError(err.message || 'Failed to create character')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push(`/player/campaigns/${params.campaignId}`)
  }

  if (!campaign) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
        <div className="text-center">
          <p className="body-md text-muted">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="headline-md text-gold">Create Your Character</CardTitle>
          <CardDescription className="body-md">
            You've joined <strong>{campaign.name}</strong>! Create your first character to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="characterName">Character Name</Label>
              <Input
                id="characterName"
                type="text"
                placeholder="Enter character name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                required
                disabled={loading}
                maxLength={100}
              />
              <p className="text-xs text-muted">
                You can create multiple characters for this campaign
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
                <p className="body-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Character'}
              </Button>
              <Button type="button" variant="outline" onClick={handleSkip} disabled={loading}>
                Skip for Now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
