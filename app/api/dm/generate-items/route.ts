/**
 * Generate Items API Route
 * 
 * @route POST /api/dm/generate-items
 * @auth Required - DM only
 * @ratelimit 50 item batches/hour
 * 
 * @body { shopId: string, prompt: string, quantity: number }
 * @returns { data: Item[], error: null } | { data: null, error: { message } }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAIClient } from '@/lib/ai'
import { buildItemGenerationSystemPrompt, buildItemGenerationPrompt } from '@/lib/prompts/item-generation'
import { GenerateItemsSchema } from '@/lib/validators/item'
import { checkRateLimit, recordUsage } from '@/lib/rate-limit'

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

    // Validate request body
    const body = await request.json()
    const validation = GenerateItemsSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: { message: 'Invalid input', details: validation.error.errors } },
        { status: 400 }
      )
    }

    const { shopId, prompt, count } = validation.data

    // Check rate limit
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
      console.error('[ITEMS GEN] Failed to create AI client:', error)
      return NextResponse.json(
        { data: null, error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    console.log('[ITEMS GEN] Using AI provider:', aiClient.getProvider(), 'model:', aiClient.getModel())

    // Verify shop ownership and get context
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, shop_type, economic_tier, campaign_id, campaigns(name, description, ruleset, setting, currency)')
      .eq('id', shopId)
      .eq('dm_id', user.id)
      .single()

    if (shopError || !shop) {
      console.error('Shop lookup error:', shopError)
      return NextResponse.json(
        { data: null, error: { message: 'Shop not found or access denied' } },
        { status: 404 }
      )
    }

    type ShopWithCampaign = {
      id: string
      name: string
      shop_type: string
      economic_tier: string
      campaign_id: string
      campaigns: { name: string; description: string | null; ruleset: string; setting: string | null; currency: string } | null
    }
    const typedShop = shop as unknown as ShopWithCampaign

    // Build context
    const shopContext = `${typedShop.name} (${typedShop.shop_type}, ${typedShop.economic_tier} tier)`
    const campaign = typedShop.campaigns
    const campaignContext = campaign ? [
      campaign.name,
      campaign.description,
      campaign.setting && `Setting: ${campaign.setting}`,
      campaign.ruleset && `Ruleset: ${campaign.ruleset}`,
      campaign.currency && `Currency: ${campaign.currency}`,
    ].filter(Boolean).join('\n') : undefined

    const currency = campaign?.currency || 'gp'

    console.log('[ITEMS GEN] Generating items with prompt:', prompt, 'count:', count, 'currency:', currency)
    const response = await aiClient.generate({
      messages: [
        { role: 'system', content: buildItemGenerationSystemPrompt(currency) },
        { role: 'user', content: buildItemGenerationPrompt(prompt, shopContext, campaignContext, count) },
      ],
      temperature: 0.9,
      responseFormat: 'json',
    })

    console.log('[ITEMS GEN] AI response received')
    const generatedData = JSON.parse(response.content || '{}')
    console.log('[ITEMS GEN] Generated items data:', JSON.stringify(generatedData, null, 2))
    
    const { items } = generatedData

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid response from AI: missing items data')
    }

    // Insert items into database
    const itemsToInsert = items.map((item: any) => ({
      shop_id: shopId,
      name: item.name,
      description: item.description,
      category: item.category,
      rarity: item.rarity,
      base_price_gp: item.base_price_gp,
      stock_quantity: item.stock_quantity || 1,
      weight_lbs: item.weight_lbs,
      is_hidden: item.is_hidden || false,
      is_revealed: !item.is_hidden, // Hidden items start as not revealed
      hidden_condition: item.hidden_condition,
      attunement_required: item.attunement_required || false,
      cursed: item.cursed || false,
      identified: item.identified !== false,
      properties: item.properties || null,
      source: 'generated',
    }))

    const { data: createdItems, error: itemsError } = await supabase
      .from('items')
      .insert(itemsToInsert as any)
      .select()

    if (itemsError) {
      console.error('Error creating items:', itemsError)
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create items in DB' } },
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
        items: createdItems,
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
    console.error('Item generation failed:', error)
    return NextResponse.json(
      { data: null, error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
