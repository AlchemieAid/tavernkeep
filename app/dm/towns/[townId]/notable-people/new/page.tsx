import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default async function NewNotablePersonPage({
  params,
}: {
  params: Promise<{ townId: string }>
}) {
  const { townId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Verify town ownership
  const { data: town, error: townError } = await supabase
    .from('towns')
    .select('*')
    .eq('id', townId)
    .eq('dm_id', user.id)
    .single()

  if (townError || !town) {
    redirect('/dm/dashboard')
  }

  // Capture resolved townId for server action closure
  const currentTownId = townId

  async function createNotablePerson(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const name = formData.get('name') as string
    const race = formData.get('race') as string
    const role = formData.get('role') as string
    const backstory = formData.get('backstory') as string
    const motivation = formData.get('motivation') as string
    const personalityTraitsRaw = formData.get('personality_traits') as string

    // Parse personality traits from comma-separated string
    let personalityTraits: string[] | null = null
    if (personalityTraitsRaw && personalityTraitsRaw.trim()) {
      personalityTraits = personalityTraitsRaw
        .split(',')
        .map(trait => trait.trim())
        .filter(trait => trait.length > 0)
    }

    const notablePersonData = {
      town_id: currentTownId,
      dm_id: user.id,
      name,
      race: race || null,
      role,
      backstory: backstory || null,
      motivation: motivation || null,
      personality_traits: personalityTraits,
      image_url: null,
    }

    const { error } = await supabase
      .from('notable_people')
      .insert(notablePersonData as any)

    if (error) {
      console.error('Error creating notable person:', error)
      redirect(`/dm/towns/${currentTownId}?error=notable_person_creation_failed`)
    }

    revalidatePath(`/dm/towns/${currentTownId}`)
    redirect(`/dm/towns/${currentTownId}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline-lg text-gold">Create Notable Person</h1>
        <p className="body-md text-on-surface-variant mt-2">
          Add a new notable person to {town.name}
        </p>
      </div>

      <form action={createNotablePerson} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Elara Moonwhisper"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="race">Race (Optional)</Label>
              <Input
                id="race"
                name="race"
                placeholder="e.g., Elf, Dwarf, Human"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopkeeper">Shopkeeper</SelectItem>
                  <SelectItem value="quest_giver">Quest Giver</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Character Details (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="backstory">Backstory</Label>
              <Textarea
                id="backstory"
                name="backstory"
                placeholder="Brief backstory of this character..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation">Motivation</Label>
              <Textarea
                id="motivation"
                name="motivation"
                placeholder="What drives this character..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality_traits">Personality Traits</Label>
              <Input
                id="personality_traits"
                name="personality_traits"
                placeholder="e.g., Brave, Cunning, Generous (comma-separated)"
              />
              <p className="text-sm text-on-surface-variant">
                Enter traits separated by commas
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit">Create Notable Person</Button>
          <Button type="button" variant="outline" asChild>
            <a href={`/dm/towns/${townId}`}>Cancel</a>
          </Button>
        </div>
      </form>
    </div>
  )
}
