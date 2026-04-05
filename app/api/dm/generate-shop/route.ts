import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { nanoid } from 'nanoid'
import { SLUG_LENGTH } from '@/lib/constants'
import { SHOP_GENERATION_SYSTEM_PROMPT, buildShopGenerationPrompt } from '@/lib/prompts/shop-generation'

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

    const { campaignId, townId, prompt, createNotablePerson = true, notablePersonId } = await request.json()

    if (!campaignId || !prompt) {
      return NextResponse.json(
        { error: { message: 'Campaign ID and prompt are required' } },
        { status: 400 }
      )
    }

    // Verify OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { error: { message: 'AI service not configured' } },
        { status: 500 }
      )
    }

    // Verify campaign ownership
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('dm_id', user.id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    // Verify town ownership if townId is provided
    if (townId) {
      const { data: town } = await supabase
        .from('towns')
        .select('id')
        .eq('id', townId)
        .eq('dm_id', user.id)
        .single()

      if (!town) {
        return NextResponse.json(
          { error: { message: 'Town not found' } },
          { status: 404 }
        )
      }
    }

    // Generate shop with GPT-4o
    console.log('Calling OpenAI API with prompt:', prompt)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SHOP_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildShopGenerationPrompt(prompt) },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }).catch((error) => {
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API failed: ${error.message}`)
    })

    console.log('OpenAI response received')
    const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('Generated shop data:', JSON.stringify(generatedData, null, 2))
    
    const { shop: shopData, items: itemsData } = generatedData

    if (!shopData || !itemsData) {
      throw new Error('Invalid response from AI: missing shop or items data')
    }

    // Create notable person if requested and not provided
    let shopkeeperId = notablePersonId
    if (createNotablePerson && !notablePersonId && townId) {
      const { data: notablePerson, error: personError } = await supabase
        .from('notable_people')
        .insert({
          town_id: townId,
          dm_id: user.id,
          name: shopData.keeper_name,
          race: shopData.keeper_race,
          role: 'shopkeeper',
          backstory: shopData.keeper_backstory,
          motivation: shopData.keeper_personality,
          personality_traits: shopData.keeper_personality ? [shopData.keeper_personality] : [],
        } as any)
        .select()
        .single()

      if (!personError && notablePerson) {
        shopkeeperId = notablePerson.id
      }
    }

    // Create shop
    const slug = nanoid(SLUG_LENGTH)
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({
        campaign_id: campaignId,
        town_id: townId || null,
        dm_id: user.id,
        name: shopData.name,
        slug,
        shop_type: shopData.shop_type,
        location_descriptor: shopData.location_descriptor,
        economic_tier: shopData.economic_tier,
        inventory_volatility: shopData.inventory_volatility,
        notable_person_id: shopkeeperId || null,
        keeper_name: shopData.keeper_name,
        keeper_race: shopData.keeper_race,
        keeper_backstory: shopData.keeper_backstory,
        price_modifier: shopData.price_modifier,
        haggle_enabled: shopData.haggle_enabled,
        haggle_dc: shopData.haggle_dc,
        is_active: true,
      } as any)
      .select()
      .single()

    if (shopError) {
      console.error('Error creating shop:', shopError)
      console.error('Shop data:', shopData)
      return NextResponse.json(
        { error: { message: `Failed to create shop: ${shopError.message}` } },
        { status: 500 }
      )
    }

    // Create items
    const itemsToInsert = itemsData.map((item: any) => ({
      shop_id: shop.id,
      name: item.name,
      description: item.description,
      category: item.category,
      rarity: item.rarity,
      base_price_gp: item.base_price_gp,
      stock_quantity: item.stock_quantity,
      is_hidden: item.is_hidden || false,
      hidden_condition: item.hidden_condition,
    }))

    const { error: itemsError } = await supabase
      .from('items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating items:', itemsError)
      // Shop was created, so we'll return success but note the item error
      return NextResponse.json({
        data: { shopId: shop.id, itemsCreated: false },
      })
    }

    return NextResponse.json({
      data: { shopId: shop.id, itemsCreated: true },
    })
  } catch (error) {
    console.error('Error generating shop:', error)
    return NextResponse.json(
      { error: { message: 'Failed to generate shop' } },
      { status: 500 }
    )
  }
}
