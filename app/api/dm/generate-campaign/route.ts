import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { GenerateCampaignSchema } from '@/lib/validators/campaign'
import { CAMPAIGN_GENERATION_SYSTEM_PROMPT, buildCampaignGenerationPrompt } from '@/lib/prompts/campaign-generation'
import { checkRateLimit, recordUsage } from '@/lib/rate-limit'
import { checkCache, storeInCache } from '@/lib/generation-cache'
import { truncateFields, CAMPAIGN_FIELD_MAP } from '@/lib/utils/truncate-fields'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    const validation = GenerateCampaignSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { message: validation.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { prompt, ruleset, setting } = validation.data

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'campaign')
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

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { data: null, error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    // Check cache first
    const cached = await checkCache(prompt, 'campaign')
    if (cached.found && cached.data) {
      console.log('Cache hit! Reusing cached campaign generation')
      
      // Generate invite token and slug
      const inviteToken = crypto.randomUUID()
      const slug = cached.data.campaign.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50)
      
      // Create campaign from cached data (truncate to ensure field limits)
      const campaignData = truncateFields({
        dm_id: user.id,
        name: cached.data.campaign.name,
        description: cached.data.campaign.description,
        ruleset: cached.data.campaign.ruleset || '5e',
        setting: cached.data.campaign.setting,
        history: cached.data.campaign.history,
        currency_name: cached.data.campaign.currency_name || 'gp',
        currency_description: cached.data.campaign.currency_description,
        pantheon: cached.data.campaign.pantheon,
        invite_token: inviteToken,
        slug: slug,
      }, CAMPAIGN_FIELD_MAP)

      const { data: createdCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData as any)
        .select()
        .single()

      if (campaignError) {
        console.error('Error creating campaign from cache:', campaignError)
        return NextResponse.json(
          { data: null, error: { message: 'Failed to create campaign' } },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        data: {
          campaign: createdCampaign, 
          suggestedTowns: cached.data.suggestedTowns || [],
          usage: {
            tokens: cached.tokensUsed || 0,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCost: '0.000000',
            model: 'cached',
            cached: true,
            cacheId: cached.cacheId,
            averageRating: cached.averageRating
          }
        },
        error: null
      })
    }

    // Check for inappropriate content
    const moderation = await openai.moderations.create({ input: prompt })
    if (moderation.results[0].flagged) {
      return NextResponse.json(
        { data: null, error: { message: 'Content violates usage policies. Please revise your prompt.' } },
        { status: 400 }
      )
    }

    console.log('Generating campaign with prompt:', prompt, 'ruleset:', ruleset, 'setting:', setting)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Much cheaper than gpt-4o
      messages: [
        { role: 'system', content: CAMPAIGN_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildCampaignGenerationPrompt(prompt, ruleset, setting) },
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

    // Generate invite token and slug
    const inviteToken = crypto.randomUUID()
    const slug = campaign.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
    
    // Create campaign (truncate to ensure field limits)
    const campaignData = truncateFields({
      dm_id: user.id,
      name: campaign.name,
      description: campaign.description,
      ruleset: campaign.ruleset || ruleset || '5e',
      setting: campaign.setting || setting,
      history: campaign.history,
      currency_name: campaign.currency_name || 'gp',
      currency_description: campaign.currency_description,
      pantheon: campaign.pantheon,
      invite_token: inviteToken,
      slug: slug,
    }, CAMPAIGN_FIELD_MAP)

    const { data: createdCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaignData as any)
      .select()
      .single()

    if (campaignError) {
      console.error('Error creating campaign:', campaignError)
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create campaign in DB' } },
        { status: 500 }
      )
    }

    // Calculate cost (gpt-4o-mini: $0.150/1M input, $0.600/1M output)
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const totalTokens = completion.usage?.total_tokens || 0
    const estimatedCost = (inputTokens * 0.150 / 1000000) + (outputTokens * 0.600 / 1000000)

    // Track usage async (fire-and-forget, don't block response)
    void recordUsage(user.id, 'campaign', {
      prompt,
      tokensUsed: totalTokens,
      inputTokens,
      outputTokens,
      estimatedCost,
      model: 'gpt-4o',
    }, supabase)

    // Store in cache for future reuse
    const cacheId = await storeInCache(
      prompt,
      'campaign',
      { campaign, suggestedTowns },
      totalTokens,
      'gpt-4o-mini'
    )

    return NextResponse.json({ 
      data: {
        campaign: createdCampaign, 
        suggestedTowns: suggestedTowns || [],
        usage: {
          tokens: totalTokens,
          inputTokens,
          outputTokens,
          estimatedCost: estimatedCost.toFixed(6),
          model: 'gpt-4o-mini',
          cached: false,
          cacheId
        }
      },
      error: null
    })
  } catch (error) {
    console.error('AI campaign generation failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
