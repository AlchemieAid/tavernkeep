/**
 * AI Item Generator Component
 * 
 * @fileoverview
 * Provides a UI for DMs to generate custom items for a shop using AI.
 * Takes a natural language description and quantity, then creates items
 * that match the shop's theme and economic tier.
 * 
 * @component
 * **Features:**
 * - Natural language item descriptions
 * - Configurable quantity (1-20 items)
 * - Automatic pricing based on shop tier
 * - Rarity assignment
 * - Stock quantity management
 * - Immediate inventory refresh
 * 
 * **Use Cases:**
 * - Add themed items to a shop
 * - Generate quest-specific items
 * - Create unique magical items
 * - Populate specialty shops
 * 
 * @example
 * ```tsx
 * <AIItemGenerator shopId={shop.id} />
 * ```
 * 
 * @see {@link /api/dm/generate-items} for API endpoint
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles } from 'lucide-react'

/**
 * Props for the AIItemGenerator component
 */
interface AIItemGeneratorProps {
  /** Shop ID to add generated items to */
  shopId: string
}

/**
 * AI-powered item generator for shop inventory
 * 
 * @description
 * Renders a form for generating custom items via AI. Items are automatically
 * priced and assigned rarity based on the shop's economic tier. Refreshes
 * the page after generation to show new items.
 * 
 * **State Management:**
 * - `prompt`: Item description from user
 * - `count`: Number of items to generate (1-20)
 * - `isGenerating`: Loading state
 * - `error`: Error display
 * 
 * **AI Generation:**
 * - Uses shop context for appropriate pricing
 * - Assigns rarity based on description
 * - Sets stock quantities
 * - Adds items directly to shop inventory
 */
export function AIItemGenerator({ shopId }: AIItemGeneratorProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState('5')

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/dm/generate-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          prompt,
          count: parseInt(count),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate items')
      }

      router.refresh()
      setPrompt('')
      setCount('5')
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
          Generate Items with AI
        </CardTitle>
        <CardDescription>
          Describe the types of items you want and let AI stock your shop
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Item Description</Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Rare magical weapons with elemental properties"
              required
              disabled={isGenerating}
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-on-surface-variant">
              Describe the type, theme, or specific items you want to generate
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Number of Items</Label>
            <Input
              id="count"
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              min="1"
              max="20"
              disabled={isGenerating}
            />
            <p className="text-xs text-on-surface-variant">
              Generate 1-20 items at once
            </p>
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
                Generating Items...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate {count} {parseInt(count) === 1 ? 'Item' : 'Items'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
