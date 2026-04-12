import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { TOWN_GENERATION_SYSTEM_PROMPT, buildTownGenerationPrompt } from '@/lib/prompts/town-generation'
import { checkRateLimit } from '@/lib/rate-limit'
import { truncateFields, TOWN_FIELD_MAP, NOTABLE_PERSON_FIELD_MAP } from '@/lib/utils/truncate-fields'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { campaignId, prompt } = await request.json()

    if (!campaignId || !prompt) {
      return NextResponse.json(
        { error: { message: 'Campaign ID and prompt are required' } },
        { status: 400 }
      )
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'town')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: { 
            message: `Rate limit exceeded: ${rateLimit.message}` 
          } 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    // Verify campaign ownership and get context
    const { data: rawCampaign } = await supabase
      .from('campaigns')
      .select('id, name, description, ruleset, setting, history, currency_name, currency_description, pantheon')
      .eq('id', campaignId)
      .eq('dm_id', user.id)
      .single()

    if (!rawCampaign) {
      return NextResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    const campaign = rawCampaign as {
      id: string
      name: string
      description: string | null
      ruleset: string | null
      setting: string | null
      history: string | null
      currency_name: string | null
      currency_description: string | null
      pantheon: string | null
    }

    // Build rich campaign context for AI
    const campaignContext = [
      campaign.name,
      campaign.description,
      campaign.setting && `Setting: ${campaign.setting}`,
      campaign.ruleset && `Ruleset: ${campaign.ruleset}`,
      campaign.history && `History: ${campaign.history}`,
      campaign.currency_name && `Currency: ${campaign.currency_name}${campaign.currency_description ? ` (${campaign.currency_description})` : ''}`,
      campaign.pantheon && `Pantheon: ${campaign.pantheon}`
    ].filter(Boolean).join('\n')

    console.log('Generating town with prompt:', prompt)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TOWN_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildTownGenerationPrompt(prompt, campaignContext) },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })

    console.log('OpenAI response received')
    const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('Generated town data:', JSON.stringify(generatedData, null, 2))
    
    const { town, notablePeople, suggestedShops } = generatedData

    console.log('Creating town in database...')
    // Truncate town data to ensure field limits (don't include ruler field yet)
    const townData = truncateFields({
      campaign_id: campaignId,
      dm_id: user.id,
      name: town.name,
      description: town.description,
      population: town.population,
      size: town.size,
      location: town.location,
      political_system: town.political_system,
      history: town.history,
    }, TOWN_FIELD_MAP)

    const { data: rawCreatedTown, error: townError } = await supabase
      .from('towns')
      .insert(townData as any)
      .select()
      .single()

    if (townError) {
      console.error('Error creating town:', townError)
      return NextResponse.json(
        { error: { message: 'Failed to create town in DB' } },
        { status: 500 }
      )
    }

    const createdTown = rawCreatedTown as { id: string } | null
    if (!createdTown) {
      return NextResponse.json(
        { error: { message: 'Failed to create town' } },
        { status: 500 }
      )
    }

    // Create notable people for the town
    let rulerName: string | null = null
    if (notablePeople && Array.isArray(notablePeople) && notablePeople.length > 0) {
      console.log(`Creating ${notablePeople.length} notable people...`)

      const notablePeopleData = notablePeople.map((person: any) =>
        truncateFields({
          town_id: createdTown.id,
          dm_id: user.id,
          name: person.name,
          race: person.race,
          role: person.role,
          backstory: person.backstory,
          motivation: person.motivation,
          personality_traits: person.personality_traits || [],
        }, NOTABLE_PERSON_FIELD_MAP)
      )

      const { data: rawCreatedPeople, error: peopleError } = await supabase
        .from('notable_people')
        .insert(notablePeopleData as any)
        .select()

      if (peopleError) {
        console.error('Error creating notable people:', peopleError)
      } else {
        const createdPeople = (rawCreatedPeople ?? []) as { id: string; name: string; role: string }[]
        console.log(`Created ${createdPeople.length} notable people`)

        // Find the ruler and update town with their name and ID
        const ruler = createdPeople.find((p) => p.role === 'ruler')
        if (ruler) {
          rulerName = ruler.name
          await supabase
            .from('towns')
            .update({
              ruler: rulerName,
              ruler_id: ruler.id
            } as any)
            .eq('id', createdTown.id)

          console.log(`Set town ruler to: ${rulerName} (ID: ${ruler.id})`)
        }
      }
    }

    // Calculate cost (gpt-4o-mini: $0.150/1M input, $0.600/1M output)
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const totalTokens = completion.usage?.total_tokens || 0
    const estimatedCost = (inputTokens * 0.150 / 1000000) + (outputTokens * 0.600 / 1000000)

    // Track usage in database
    await supabase.from('ai_usage').insert({
      dm_id: user.id,
      generation_type: 'town',
      prompt,
      tokens_used: totalTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      model: 'gpt-4o-mini'
    } as any)

    return NextResponse.json({ 
      town: { ...(createdTown as any), ruler: rulerName || (createdTown as any).ruler },
      notablePeople: notablePeople || [],
      suggestedShops: suggestedShops || [],
      usage: {
        tokens: totalTokens,
        inputTokens,
        outputTokens,
        estimatedCost: estimatedCost.toFixed(6),
        model: 'gpt-4o-mini'
      }
    })
  } catch (error) {
    console.error('AI town generation failed:', error)
    return NextResponse.json(
      { error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
