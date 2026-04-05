import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { CAMPAIGN_GENERATION_SYSTEM_PROMPT, buildCampaignGenerationPrompt } from '@/lib/prompts/campaign-generation'

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

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: { message: 'Prompt is required' } },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    // Check for inappropriate content
    const moderation = await openai.moderations.create({ input: prompt })
    if (moderation.results[0].flagged) {
      return NextResponse.json(
        { error: { message: 'Content violates usage policies. Please revise your prompt.' } },
        { status: 400 }
      )
    }

    console.log('Generating campaign with prompt:', prompt)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Much cheaper than gpt-4o
      messages: [
        { role: 'system', content: CAMPAIGN_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildCampaignGenerationPrompt(prompt) },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })

    console.log('OpenAI response received')
    const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('Generated campaign data:', JSON.stringify(generatedData, null, 2))
    
    const { campaign, suggestedTowns } = generatedData

    if (!campaign) {
      throw new Error('Invalid response from AI: missing campaign data')
    }

    // Create campaign
    const { data: createdCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        dm_id: user.id,
        name: campaign.name,
        description: campaign.description,
      })
      .select()
      .single()

    if (campaignError) {
      console.error('Error creating campaign:', campaignError)
      return NextResponse.json(
        { error: { message: 'Failed to create campaign in DB' } },
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
      generation_type: 'campaign',
      prompt,
      tokens_used: totalTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      model: 'gpt-4o-mini'
    })

    return NextResponse.json({ 
      campaign: createdCampaign, 
      suggestedTowns: suggestedTowns || [],
      usage: {
        tokens: totalTokens,
        inputTokens,
        outputTokens,
        estimatedCost: estimatedCost.toFixed(6),
        model: 'gpt-4o-mini'
      }
    })
  } catch (error) {
    console.error('AI campaign generation failed:', error)
    return NextResponse.json(
      { error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
