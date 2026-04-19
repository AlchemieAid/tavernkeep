/**
 * Notable Person Edit Form
 * 
 * @fileoverview
 * Form for editing NPC details including name, race, role, backstory, motivation, and personality traits.
 * Includes role dropdown and character limit enforcement.
 * 
 * @features
 * - NPC role selection
 * - Personality traits management
 * - Character limits
 * - Optimistic updates
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save, X } from 'lucide-react'
import Link from 'next/link'
import { FIELD_LIMITS } from '@/lib/constants/field-limits'

interface NotablePerson {
  id: string
  town_id: string
  name: string
  race: string | null
  role: string
  backstory: string | null
  motivation: string | null
  personality_traits: string[] | null
}

interface NotablePersonEditFormProps {
  person: NotablePerson
  townId: string
}

export function NotablePersonEditForm({ person, townId }: NotablePersonEditFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: person.name || '',
    race: person.race || '',
    role: person.role || '',
    backstory: person.backstory || '',
    motivation: person.motivation || '',
    personality_traits: person.personality_traits?.join(', ') || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const traitsArray = formData.personality_traits
        ? formData.personality_traits.split(',').map(t => t.trim()).filter(Boolean)
        : []

      const response = await fetch(`/api/dm/notable-people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          race: formData.race || null,
          role: formData.role,
          backstory: formData.backstory || null,
          motivation: formData.motivation || null,
          personality_traits: traitsArray.length > 0 ? traitsArray : null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update notable person')
      }

      router.push(`/dm/towns/${townId}`)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="headline-lg text-on-surface">Edit Notable Person</h1>
        <Button variant="outline" asChild>
          <Link href={`/dm/towns/${townId}`}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core character details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Elara Moonwhisper"
                required
                disabled={isSaving}
                maxLength={FIELD_LIMITS.NOTABLE_PERSON_NAME}
              />
              <p className="text-xs text-on-surface-variant">
                {formData.name.length}/{FIELD_LIMITS.NOTABLE_PERSON_NAME} characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="race">Race</Label>
                <Input
                  id="race"
                  value={formData.race}
                  onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                  placeholder="e.g., Half-Elf"
                  disabled={isSaving}
                  maxLength={FIELD_LIMITS.NOTABLE_PERSON_RACE}
                />
                <p className="text-xs text-on-surface-variant">
                  {formData.race.length}/{FIELD_LIMITS.NOTABLE_PERSON_RACE} characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Fortune Teller, Blacksmith, Town Elder"
                  disabled={isSaving}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Character Details</CardTitle>
            <CardDescription>Background and personality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backstory">Backstory</Label>
              <Textarea
                id="backstory"
                value={formData.backstory}
                onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                placeholder="Character's history and background..."
                rows={4}
                disabled={isSaving}
                maxLength={FIELD_LIMITS.NOTABLE_PERSON_BACKSTORY}
              />
              <p className="text-xs text-on-surface-variant">
                {formData.backstory.length}/{FIELD_LIMITS.NOTABLE_PERSON_BACKSTORY} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation">Motivation</Label>
              <Textarea
                id="motivation"
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                placeholder="What drives this character..."
                rows={3}
                disabled={isSaving}
                maxLength={FIELD_LIMITS.NOTABLE_PERSON_MOTIVATION}
              />
              <p className="text-xs text-on-surface-variant">
                {formData.motivation.length}/{FIELD_LIMITS.NOTABLE_PERSON_MOTIVATION} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality_traits">Personality Traits</Label>
              <Input
                id="personality_traits"
                value={formData.personality_traits}
                onChange={(e) => setFormData({ ...formData, personality_traits: e.target.value })}
                placeholder="e.g., Brave, Cunning, Loyal (comma-separated)"
                disabled={isSaving}
              />
              <p className="text-xs text-on-surface-variant">
                Separate multiple traits with commas
              </p>
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
            <Link href={`/dm/towns/${townId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
