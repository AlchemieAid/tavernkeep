/**
 * Town Edit Form
 * 
 * @fileoverview
 * Form for editing town details including name, description, population, size, location, political system, and history.
 * Includes dropdowns for size/location/political system and character limit enforcement.
 * 
 * @features
 * - Controlled inputs with validation
 * - Size/location/political system dropdowns
 * - Character limits from FIELD_LIMITS
 * - Optimistic UI updates
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, X } from 'lucide-react'
import Link from 'next/link'
import { FIELD_LIMITS } from '@/lib/constants/field-limits'

interface Town {
  id: string
  campaign_id: string
  name: string
  description: string | null
  population: number | null
  size: string | null
  location: string | null
  ruler: string | null
  ruler_id: string | null
  political_system: string | null
  history: string | null
}

interface NotablePerson {
  id: string
  name: string
  role: string
}

interface TownEditFormProps {
  town: Town
  notablePeople: NotablePerson[]
}

export function TownEditForm({ town, notablePeople }: TownEditFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: town.name || '',
    description: town.description || '',
    population: town.population?.toString() || '',
    size: town.size || '',
    location: town.location || '',
    ruler_id: town.ruler_id || '',
    political_system: town.political_system || '',
    history: town.history || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/dm/towns/${town.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          population: formData.population ? parseInt(formData.population) : null,
          size: formData.size || null,
          location: formData.location || null,
          ruler_id: formData.ruler_id || null,
          political_system: formData.political_system || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update town')
      }

      router.push(`/dm/towns/${town.id}`)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="headline-lg text-on-surface">Edit Town</h1>
        <Button variant="outline" asChild>
          <Link href={`/dm/towns/${town.id}`}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core town details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Town Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Riverdale"
                required
                disabled={isSaving}
                maxLength={FIELD_LIMITS.TOWN_NAME}
              />
              <p className="text-xs text-on-surface-variant">
                {formData.name.length}/{FIELD_LIMITS.TOWN_NAME} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief town overview..."
                rows={3}
                disabled={isSaving}
                maxLength={FIELD_LIMITS.TOWN_DESCRIPTION}
              />
              <p className="text-xs text-on-surface-variant">
                {formData.description.length}/{FIELD_LIMITS.TOWN_DESCRIPTION} characters
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Town Characteristics</CardTitle>
            <CardDescription>Define your town&apos;s attributes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="population">Population</Label>
                <Input
                  id="population"
                  type="number"
                  value={formData.population}
                  onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                  placeholder="e.g., 5000"
                  disabled={isSaving}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData({ ...formData, size: value })}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hamlet">Hamlet</SelectItem>
                    <SelectItem value="village">Village</SelectItem>
                    <SelectItem value="town">Town</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="metropolis">Metropolis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Geographic Location</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => setFormData({ ...formData, location: value })}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desert">Desert</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                  <SelectItem value="wilderness">Wilderness</SelectItem>
                  <SelectItem value="necropolis">Necropolis</SelectItem>
                  <SelectItem value="arctic">Arctic</SelectItem>
                  <SelectItem value="plains">Plains</SelectItem>
                  <SelectItem value="riverside">Riverside</SelectItem>
                  <SelectItem value="coastal">Coastal</SelectItem>
                  <SelectItem value="mountain">Mountain</SelectItem>
                  <SelectItem value="swamp">Swamp</SelectItem>
                  <SelectItem value="underground">Underground</SelectItem>
                  <SelectItem value="floating">Floating</SelectItem>
                  <SelectItem value="jungle">Jungle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruler_id">Ruler / Leadership</Label>
              <Select
                value={formData.ruler_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, ruler_id: value })}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a ruler (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {notablePeople.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-on-surface-variant">
                {notablePeople.length === 0 
                  ? 'No notable people yet. Create some first to assign a ruler.' 
                  : 'Select from notable people in this town'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="political_system">Political System</Label>
              <Select
                value={formData.political_system}
                onValueChange={(value) => setFormData({ ...formData, political_system: value })}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monarchy">Monarchy</SelectItem>
                  <SelectItem value="democracy">Democracy</SelectItem>
                  <SelectItem value="oligarchy">Oligarchy</SelectItem>
                  <SelectItem value="theocracy">Theocracy</SelectItem>
                  <SelectItem value="anarchy">Anarchy</SelectItem>
                  <SelectItem value="military">Military</SelectItem>
                  <SelectItem value="tribal">Tribal</SelectItem>
                  <SelectItem value="merchant_guild">Merchant Guild</SelectItem>
                  <SelectItem value="magocracy">Magocracy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History & Lore</CardTitle>
            <CardDescription>Rich background for your town</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="history">Town History</Label>
              <Textarea
                id="history"
                value={formData.history}
                onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                placeholder="Major historical events, founding story, notable figures..."
                rows={4}
                disabled={isSaving}
                maxLength={FIELD_LIMITS.TOWN_HISTORY}
              />
              <p className="text-xs text-on-surface-variant">
                {formData.history.length}/{FIELD_LIMITS.TOWN_HISTORY} characters
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
            <Link href={`/dm/towns/${town.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
