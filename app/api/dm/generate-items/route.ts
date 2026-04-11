import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { buildItemGenerationSystemPrompt, buildItemGenerationPrompt } from '@/lib/prompts/item-generation'
import { GenerateItemsSchema } from '@/lib/validators/item'
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
            'X-RateLimit-Reset': rateLimit.resetAt?.toString() || ''
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

    // Build context
    const shopContext = `${shop.name} (${shop.shop_type}, ${shop.economic_tier} tier)`
    const campaign = shop.campaigns as any
    const campaignContext = campaign ? [
      campaign.name,
      campaign.description,
      campaign.setting && `Setting: ${campaign.setting}`,
      campaign.ruleset && `Ruleset: ${campaign.ruleset}`,
      campaign.currency && `Currency: ${campaign.currency}`,
    ].filter(Boolean).join('\n') : undefined

    const currency = campaign?.currency || 'gp'

    console.log('Generating items with prompt:', prompt, 'count:', count, 'currency:', currency)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildItemGenerationSystemPrompt(currency) },
        { role: 'user', content: buildItemGenerationPrompt(prompt, shopContext, campaignContext, count) },
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    })

    console.log('OpenAI response received')
    const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('Generated items data:', JSON.stringify(generatedData, null, 2))
    
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

    // Calculate cost
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const totalTokens = completion.usage?.total_tokens || 0
    const estimatedCost = (inputTokens * 0.150 / 1000000) + (outputTokens * 0.600 / 1000000)

    // Track usage in database
    await supabase.from('ai_usage').insert({
      dm_id: user.id,
      generation_type: 'items',
      prompt,
      tokens_used: totalTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      model: 'gpt-4o-mini'
    } as any)

    return NextResponse.json({ 
      data: {
        items: createdItems,
        usage: {
          tokens: totalTokens,
          inputTokens,
          outputTokens,
          estimatedCost: estimatedCost.toFixed(6),
          model: 'gpt-4o-mini'
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
