'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AINotablePersonGeneratorProps {
  townId: string
}

export function AINotablePersonGenerator({ townId }: AINotablePersonGeneratorProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [role, setRole] = useState('')
  const [count, setCount] = useState('1')

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/dm/generate-notable-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          townId,
          prompt,
          role: role || undefined,
          count: parseInt(count),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate notable person')
      }

      router.refresh()
      setPrompt('')
      setRole('')
      setCount('1')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          Generate Notable People
        </CardTitle>
        <CardDescription>
          Use AI to create interesting characters for your town
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Description</Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A mysterious fortune teller with a dark past"
              required
              disabled={isGenerating}
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-on-surface-variant">
              Describe the type of person you want to create
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role (Optional)</Label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any role</SelectItem>
                  <SelectItem value="ruler">Ruler</SelectItem>
                  <SelectItem value="priest">Priest</SelectItem>
                  <SelectItem value="magician">Magician</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                  <SelectItem value="guard">Guard</SelectItem>
                  <SelectItem value="noble">Noble</SelectItem>
                  <SelectItem value="commoner">Commoner</SelectItem>
                  <SelectItem value="blacksmith">Blacksmith</SelectItem>
                  <SelectItem value="innkeeper">Innkeeper</SelectItem>
                  <SelectItem value="healer">Healer</SelectItem>
                  <SelectItem value="scholar">Scholar</SelectItem>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="artisan">Artisan</SelectItem>
                  <SelectItem value="shopkeeper">Shopkeeper</SelectItem>
                  <SelectItem value="quest_giver">Quest Giver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                min="1"
                max="5"
                disabled={isGenerating}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500 rounded text-sm text-red-500">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate {count} {parseInt(count) === 1 ? 'Person' : 'People'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
