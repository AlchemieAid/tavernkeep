/**
 * Generate Notable Person API Route
 * 
 * @route POST /api/dm/generate-notable-person
 * @auth Required - DM only
 * @ratelimit 50 NPCs/hour
 * 
 * @body { townId: string, prompt: string, role?: string, count?: number }
 * @returns { data: NotablePerson[], error: null } | { data: null, error: { message } }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAIClient } from '@/lib/ai'
import { z } from 'zod'
import { NOTABLE_PERSON_GENERATION_SYSTEM_PROMPT, buildNotablePersonGenerationPrompt } from '@/lib/prompts/notable-person-generation'
import { checkRateLimit, recordUsage } from '@/lib/rate-limit'
import { truncateFields, NOTABLE_PERSON_FIELD_MAP } from '@/lib/utils/truncate-fields'
import { GenerateNotablePersonSchema } from '@/lib/validators/notable-person'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Validate request body with Zod
    const body = await request.json()
    const validation = GenerateNotablePersonSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { message: validation.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { townId, prompt, role, count } = validation.data

    // Check rate limit (using 'town' rate limit for now, can create separate limit later)
    const rateLimit = await checkRateLimit(user.id, 'town')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { data: null, error: { message: rateLimit.message } },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      )
    }

    // Create AI client using unified interface
    let aiClient
    try {
      aiClient = createAIClient()
    } catch (error) {
      console.error('[NPC GEN] Failed to create AI client:', error)
      return NextResponse.json(
        { data: null, error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    console.log('[NPC GEN] Using AI provider:', aiClient.getProvider(), 'model:', aiClient.getModel())

    // Verify town ownership and get context
    const { data: town, error: townError } = await supabase
      .from('towns')
      .select('id, name, description, campaign_id, campaigns(name, description, ruleset, setting, history, currency_name, currency_description, pantheon)')
      .eq('id', townId)
      .eq('dm_id', user.id)
      .single()

    if (townError || !town) {
      console.error('Town lookup error:', townError)
      return NextResponse.json(
        { data: null, error: { message: 'Town not found or access denied' } },
        { status: 404 }
      )
    }

    // Build context
    type TownWithCampaign = {
      name: string
      description: string | null
      campaigns: { 
        name: string
        description: string | null
        setting: string | null
        ruleset: string
        currency_name: string
        currency_description: string | null
        pantheon: string | null
      } | null
    }
    const typedTown = town as unknown as TownWithCampaign
    const townContext = `${typedTown.name}: ${typedTown.description || ''}`
    const campaign = typedTown.campaigns
    const campaignContext = campaign ? [
      campaign.name,
      campaign.description,
      campaign.setting && `Setting: ${campaign.setting}`,
      campaign.ruleset && `Ruleset: ${campaign.ruleset}`,
      campaign.currency_name && `Currency: ${campaign.currency_name}${campaign.currency_description ? ` (${campaign.currency_description})` : ''}`,
      campaign.pantheon && `Pantheon: ${campaign.pantheon}`,
    ].filter(Boolean).join('\n') : undefined

    console.log('[NPC GEN] Generating notable person(s) with prompt:', prompt, 'count:', count, 'role:', role)
    const response = await aiClient.generate({
      messages: [
        { role: 'system', content: NOTABLE_PERSON_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildNotablePersonGenerationPrompt(prompt, townContext, campaignContext, role, count) },
      ],
      temperature: 0.9, // Higher temperature for more creative NPCs
      responseFormat: 'json',
    })

    console.log('[NPC GEN] AI response received')
    const generatedData = JSON.parse(response.content || '{}')
    console.log('[NPC GEN] Generated notable people data:', JSON.stringify(generatedData, null, 2))
    
    const { notablePeople } = generatedData

    if (!notablePeople || !Array.isArray(notablePeople) || notablePeople.length === 0) {
      throw new Error('Invalid response from AI: missing notable people data')
    }

    // Insert all notable people into database with truncation
    const peopleToInsert = notablePeople.map((person: any) => 
      truncateFields({
        town_id: townId,
        dm_id: user.id,
        name: person.name,
        race: person.race,
        role: person.role,
        backstory: person.backstory,
        motivation: person.motivation,
        personality_traits: person.personality_traits || [],
      }, NOTABLE_PERSON_FIELD_MAP)
    )

    const { data: createdPeople, error: peopleError } = await supabase
      .from('notable_people')
      .insert(peopleToInsert as any)
      .select()

    if (peopleError) {
      console.error('Error creating notable people:', peopleError)
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create notable people in DB' } },
        { status: 500 }
      )
    }

    // Calculate cost based on provider
    const inputTokens = response.tokensUsed?.input || 0
    const outputTokens = response.tokensUsed?.output || 0
    const totalTokens = response.tokensUsed?.total || 0
    const provider = aiClient.getProvider()
    const model = aiClient.getModel()
    
    // Cost calculation (approximate)
    let estimatedCost = 0
    if (provider === 'openai') {
      // gpt-4o-mini: $0.150/1M input, $0.600/1M output
      estimatedCost = (inputTokens * 0.150 / 1000000) + (outputTokens * 0.600 / 1000000)
    } else if (provider === 'gemini') {
      // gemini-2.5-flash-lite: Free tier, minimal cost
      estimatedCost = 0
    }

    // Track usage async (fire-and-forget, don't block response)
    void recordUsage(user.id, 'item', {
      prompt,
      tokensUsed: totalTokens,
      inputTokens,
      outputTokens,
      estimatedCost,
      model,
    }, supabase)

    return NextResponse.json({ 
      data: {
        notablePeople: createdPeople,
        usage: {
          tokens: totalTokens,
          inputTokens,
          outputTokens,
          estimatedCost: estimatedCost.toFixed(6),
          model,
          provider
        }
      },
      error: null
    })
  } catch (error) {
    console.error('AI notable person generation failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
