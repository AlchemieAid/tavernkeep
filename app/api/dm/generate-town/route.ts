import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { TOWN_GENERATION_SYSTEM_PROMPT, buildTownGenerationPrompt } from '@/lib/prompts/town-generation'

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
      .select('id, name, description')
      .eq('id', campaignId)
      .eq('dm_id', user.id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    const campaignContext = campaign.description || campaign.name

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

    return NextResponse.json({ 
      town: createdTown, 
      suggestedShops: suggestedShops || [] 
    })
  } catch (error) {
    console.error('AI town generation failed:', error)
    return NextResponse.json(
      { error: { message: (error as Error).message || 'Unknown error' } },
      { status: 500 }
    )
  }
}
