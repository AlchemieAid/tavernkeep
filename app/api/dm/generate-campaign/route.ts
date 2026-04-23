/**
 * Generate Campaign API Route
 * 
 * @fileoverview
 * POST endpoint for AI-powered campaign generation.
 * Creates campaign with world-building elements (setting, history, currency, pantheon).
 * 
 * @route POST /api/dm/generate-campaign
 * @auth Required - DM only
 * @ratelimit 10 campaigns/hour
 * 
 * @body
 * - prompt: string - Campaign idea
 * - ruleset?: string - RPG system (default: '5e')
 * - setting?: string - Campaign setting
 * 
 * @returns
 * - success: { data: Campaign, error: null }
 * - error: { data: null, error: { message: string } }
 * 
 * @flow
 * 1. Authenticate user
 * 2. Validate input with Zod
 * 3. Check rate limit
 * 4. Call OpenAI with campaign prompt
 * 5. Parse JSON response
 * 6. Truncate fields to DB limits
 * 7. Insert campaign
 * 8. Record AI usage
 * 9. Return created campaign
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { GenerateCampaignSchema } from '@/lib/validators/campaign'
import { CAMPAIGN_GENERATION_SYSTEM_PROMPT, buildCampaignGenerationPrompt } from '@/lib/prompts/campaign-generation'
import { checkRateLimit, recordUsage } from '@/lib/rate-limit'
import { truncateFields, CAMPAIGN_FIELD_MAP } from '@/lib/utils/truncate-fields'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('[CAMPAIGN GEN] API call started at', new Date().toISOString())
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('[CAMPAIGN GEN] No user found')
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    console.log('[CAMPAIGN GEN] User authenticated:', user.id)

    // Validate request body with Zod
    const body = await request.json()
    const validation = GenerateCampaignSchema.safeParse(body)
    
    if (!validation.success) {
      console.error('[CAMPAIGN GEN] Validation failed:', validation.error.errors)
      return NextResponse.json(
        { data: null, error: { message: validation.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { prompt, ruleset, setting } = validation.data
    console.log('[CAMPAIGN GEN] Validation passed, prompt:', prompt.substring(0, 50))

    // Check rate limit
    const rateLimitStart = Date.now()
    const rateLimit = await checkRateLimit(user.id, 'campaign')
    const rateLimitDuration = Date.now() - rateLimitStart
    console.log('[CAMPAIGN GEN] Rate limit check took', rateLimitDuration, 'ms')
    
    if (!rateLimit.allowed) {
      console.error('[CAMPAIGN GEN] Rate limit exceeded')
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
      console.error('[CAMPAIGN GEN] OPENAI_API_KEY not configured')
      return NextResponse.json(
        { data: null, error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    // TODO: Implement generation cache for reusing similar prompts
    
    // Check for inappropriate content
    const moderationStart = Date.now()
    const moderation = await openai.moderations.create({ input: prompt })
    const moderationDuration = Date.now() - moderationStart
    console.log('[CAMPAIGN GEN] Moderation check took', moderationDuration, 'ms')
    
    if (moderation.results[0].flagged) {
      console.error('[CAMPAIGN GEN] Content flagged by moderation')
      return NextResponse.json(
        { data: null, error: { message: 'Content violates usage policies. Please revise your prompt.' } },
        { status: 400 }
      )
    }

    console.log('[CAMPAIGN GEN] Calling OpenAI API...')
    const openaiStart = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Much cheaper than gpt-4o
      messages: [
        { role: 'system', content: CAMPAIGN_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildCampaignGenerationPrompt(prompt, ruleset, setting) },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })
    const openaiDuration = Date.now() - openaiStart
    console.log('[CAMPAIGN GEN] OpenAI API call took', openaiDuration, 'ms')

    console.log('[CAMPAIGN GEN] OpenAI response received')
    const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('[CAMPAIGN GEN] Generated campaign data:', JSON.stringify(generatedData, null, 2))
    
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
    
    console.log('[CAMPAIGN GEN] Inserting campaign into database...')
    // Create campaign (truncate to ensure field limits)
    const campaignData = truncateFields({
      dm_id: user.id,
      name: campaign.name,
      description: campaign.description,
      ruleset: campaign.ruleset || ruleset || '5e',
      setting: campaign.setting || setting,
      history: campaign.history,
      currency_name: campaign.currency_name || null,
      currency_description: campaign.currency_description,
      pantheon: campaign.pantheon,
      invite_token: inviteToken,
      slug: slug,
    }, CAMPAIGN_FIELD_MAP)

    const dbInsertStart = Date.now()
    const { data: createdCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaignData as any)
      .select()
      .single()
    const dbInsertDuration = Date.now() - dbInsertStart
    console.log('[CAMPAIGN GEN] DB insert took', dbInsertDuration, 'ms')

    if (campaignError) {
      console.error('[CAMPAIGN GEN] Error creating campaign:', campaignError)
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create campaign in DB' } },
        { status: 500 }
      )
    }

    console.log('[CAMPAIGN GEN] Campaign created successfully, ID:', createdCampaign.id)

    // Calculate cost (gpt-4o-mini: $0.150/1M input, $0.600/1M output)
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const totalTokens = completion.usage?.total_tokens || 0
    const estimatedCost = (inputTokens * 0.150 / 1000000) + (outputTokens * 0.600 / 1000000)

    // Track usage async (fire-and-forget, don't block response)
    console.log('[CAMPAIGN GEN] Recording usage...')
    void recordUsage(user.id, 'campaign', {
      prompt,
      tokensUsed: totalTokens,
      inputTokens,
      outputTokens,
      estimatedCost,
      model: 'gpt-4o',
    }, supabase)

    const totalDuration = Date.now() - startTime
    console.log('[CAMPAIGN GEN] Total API duration:', totalDuration, 'ms')
    console.log('[CAMPAIGN GEN] Sending response to client')

    // TODO: Re-enable when cache tables are created
    // Store in cache for future reuse
    // await storeInCache(
    //   prompt,
    //   'campaign',
    //   { campaign, suggestedTowns },
    //   completion.usage?.total_tokens || 0,
    //   completion.model
    // )

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
          cached: false
        }
      },
      error: null
    })
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('[CAMPAIGN GEN] AI campaign generation failed after', totalDuration, 'ms:', error)
    console.error('[CAMPAIGN GEN] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    })
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
