import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { TOWN_GENERATION_SYSTEM_PROMPT, buildTownGenerationPrompt } from '@/lib/prompts/town-generation'
import { checkRateLimit } from '@/lib/rate-limit'

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
            message: `Rate limit exceeded. You can generate ${rateLimit.remaining} more towns. Resets at ${rateLimit.resetAt.toLocaleTimeString()}.` 
          } 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
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
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, description, ruleset, setting, history, currency_name, currency_description, pantheon')
      .eq('id', campaignId)
      .eq('dm_id', user.id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      )
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
    
    const { town, suggestedShops } = generatedData

    if (!town) {
      throw new Error('Invalid response from AI: missing town data')
    }

    // Create town
    const { data: createdTown, error: townError } = await supabase
      .from('towns')
      .insert({
        campaign_id: campaignId,
        dm_id: user.id,
        name: town.name,
        description: town.description,
        population: town.population,
        size: town.size,
        location: town.location,
        ruler: town.ruler,
        political_system: town.political_system,
        history: town.history,
      })
      .select()
      .single()

    if (townError) {
      console.error('Error creating town:', townError)
      return NextResponse.json(
        { error: { message: 'Failed to create town in DB' } },
        { status: 500 }
      )
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
      town: createdTown, 
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
