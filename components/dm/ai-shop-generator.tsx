'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AIShopGeneratorProps {
  campaignId: string
}

export function AIShopGenerator({ campaignId }: AIShopGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('A mysterious apothecary in a dark alley, run by a suspicious halfling')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/dm/generate-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, prompt }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate shop')
      }

      // Redirect to the newly created shop
      router.push(`/dm/shops/${result.data.shopId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate shop')
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>✨ AI Shop Generator</CardTitle>
        <CardDescription>
          Describe a shop and let AI generate it with items automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">Shop Description</Label>
            <Input
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted">
              Example: "A blacksmith in a dwarven mountain city" or "A magical curiosity shop run by an eccentric gnome"
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? 'Generating...' : 'Generate Shop with AI'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
