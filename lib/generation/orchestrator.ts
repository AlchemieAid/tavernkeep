/**
 * Generation Orchestrator
 * Coordinates hierarchical AI content generation with cascading context
 * 
 * Architecture: Strategy Pattern + Builder Pattern
 * - Each generator is a strategy
 * - ContextBuilder accumulates context down the hierarchy
 * - Orchestrator coordinates the flow
 */

import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { 
  GenerationConfig, 
  DEFAULT_GENERATION_CONFIG, 
  GenerationContext,
  GenerationProgress,
  GenerationEvent,
  GenerationOptions
} from './types'
import { ContextBuilder, createContextBuilder } from './context-builder'
import { CAMPAIGN_GENERATION_SYSTEM_PROMPT, buildCampaignGenerationPrompt } from '@/lib/prompts/campaign-generation'
import { TOWN_GENERATION_SYSTEM_PROMPT, buildTownGenerationPrompt } from '@/lib/prompts/town-generation'
import { SHOP_GENERATION_SYSTEM_PROMPT, buildShopGenerationPrompt } from '@/lib/prompts/shop-generation'
import { NOTABLE_PERSON_GENERATION_SYSTEM_PROMPT, buildNotablePersonGenerationPrompt } from '@/lib/prompts/notable-person-generation'
import { buildItemGenerationSystemPrompt, buildItemGenerationPrompt } from '@/lib/prompts/item-generation'
import { truncateFields, CAMPAIGN_FIELD_MAP, TOWN_FIELD_MAP, NOTABLE_PERSON_FIELD_MAP } from '@/lib/utils/truncate-fields'
import { checkRateLimit } from '@/lib/rate-limit'
import { nanoid } from 'nanoid'
import { SLUG_LENGTH } from '@/lib/constants'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface GeneratorResult<T> {
  success: boolean
  data?: T
  error?: string
}

export class GenerationOrchestrator {
  private config: GenerationConfig
  private progress: GenerationProgress
  private callbacks?: GenerationOptions['onProgress']
  private userId: string
  private dmId: string

  constructor(userId: string, dmId: string, options?: GenerationOptions) {
    this.userId = userId
    this.dmId = dmId
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...options?.config }
    this.callbacks = options?.onProgress
    this.progress = {
      totalSteps: 0,
      completedSteps: 0,
      currentStep: '',
      status: 'idle',
      errors: [],
      results: {}
    }
  }

  private emit(event: GenerationEvent) {
    if (this.callbacks) {
      this.callbacks(event)
    }
  }

  private emitStepStarted(step: string, details?: string) {
    this.progress.currentStep = step
    this.emit({ 
      type: 'step_started', 
      step, 
      progress: { ...this.progress },
      details
    } as any)
  }

  private emitEntityCreated(type: string, entity: any) {
    this.emit({
      type: 'entity_created',
      entityType: type,
      entity,
      progress: { ...this.progress }
    } as any)
  }

  private async trackAIUsage(
    supabase: any,
    type: string,
    prompt: string,
    tokens: { input: number; output: number; total: number },
    model: string
  ) {
    const estimatedCost = (tokens.input * 0.150 / 1000000) + (tokens.output * 0.600 / 1000000)
    
    await supabase.from('ai_usage').insert({
      dm_id: this.dmId,
      generation_type: type,
      prompt,
      tokens_used: tokens.total,
      input_tokens: tokens.input,
      output_tokens: tokens.output,
      estimated_cost: estimatedCost,
      model,
    } as any)
  }

  /**
   * Main entry point: Generate a complete campaign hierarchy
   */
  private generatedNames: {
    towns: Set<string>
    shops: Set<string>
    people: Set<string>
  } = { towns: new Set(), shops: new Set(), people: new Set() }

  async generateCampaign(prompt: string, ruleset?: string, setting?: string): Promise<GeneratorResult<any>> {
    this.progress.status = 'running'
    this.generatedNames = { towns: new Set(), shops: new Set(), people: new Set() }
    
    try {
      this.emitStepStarted('init', 'Connecting to database...')
      
      // Create supabase client with timeout
      const supabasePromise = createClient()
      const supabase = await Promise.race([
        supabasePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 10000)
        )
      ]) as any
      
      this.emitStepStarted('campaign', 'Generating campaign with AI (this takes 10-20 seconds)...')

      // 1. Generate Campaign
      const campaignResult = await this.generateCampaignEntity(supabase, prompt, ruleset, setting)
      
      if (!campaignResult.success) {
        return { success: false, error: campaignResult.error }
      }

      const campaign = campaignResult.data
      this.progress.results.campaign = campaign
      this.progress.completedSteps++
      
      this.emit({ 
        type: 'step_completed', 
        step: 'campaign', 
        data: campaign,
        progress: { ...this.progress }
      })

      // 2. Auto-generate Towns if configured
      if (this.config.campaign.autoGenerateTowns) {
        await this.generateTownsForCampaign(supabase, campaign, prompt)
      }

      this.progress.status = 'completed'
      this.emit({ type: 'completed', results: this.progress.results })

      return { success: true, data: this.progress.results }
    } catch (error) {
      const errorMsg = (error as Error).message
      console.error('Generation error:', error)
      this.progress.status = 'error'
      this.progress.errors.push(errorMsg)
      this.emit({ type: 'failed', error: errorMsg, progress: { ...this.progress } })
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Generate a single campaign entity
   */
  private async generateCampaignEntity(supabase: any, prompt: string, ruleset?: string, setting?: string): Promise<GeneratorResult<any>> {
    // Rate limit check with timeout
    this.emitStepStarted('rate_limit', 'Checking rate limits...')
    const rateLimitPromise = checkRateLimit(this.dmId, 'campaign')
    const rateLimit = await Promise.race([
      rateLimitPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Rate limit check timeout')), 5000)
      )
    ])
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.message }
    }

    // OpenAI call with timeout
    const openaiPromise = openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CAMPAIGN_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildCampaignGenerationPrompt(prompt, ruleset, setting) },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })
    
    const completion = await Promise.race([
      openaiPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('AI generation timeout - OpenAI is slow')), 60000)
      )
    ])

    const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
    const { campaign, suggestedTowns } = generatedData

    if (!campaign) {
      return { success: false, error: 'Invalid AI response: missing campaign data' }
    }

    // Create campaign in DB
    const inviteToken = crypto.randomUUID()
    const slug = campaign.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)

    const campaignData = truncateFields({
      dm_id: this.dmId,
      name: campaign.name,
      description: campaign.description,
      ruleset: campaign.ruleset || ruleset || '5e',
      setting: campaign.setting || setting,
      history: campaign.history,
      currency: campaign.currency || 'gp',
      invite_token: inviteToken,
      slug,
    }, CAMPAIGN_FIELD_MAP)

    const { data: createdCampaign, error } = await supabase
      .from('campaigns')
      .insert(campaignData as any)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Failed to create campaign: ${error.message}` }
    }

    // Track usage
    await this.trackAIUsage(
      supabase,
      'campaign',
      prompt,
      {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      },
      'gpt-4o-mini'
    )

    return { success: true, data: createdCampaign }
  }

  /**
   * Generate towns for a campaign
   */
  private makeUniqueName(name: string, existingNames: Set<string>): string {
    if (!existingNames.has(name)) return name
    
    // Add roman numeral or random suffix
    const baseName = name.replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i, '')
    let counter = 2
    let newName = `${baseName} ${this.toRoman(counter)}`
    
    while (existingNames.has(newName) && counter < 20) {
      counter++
      newName = `${baseName} ${this.toRoman(counter)}`
    }
    
    return newName
  }
  
  private toRoman(num: number): string {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
    return roman[num - 1] || `${num}`
  }

  private async generateTownsForCampaign(supabase: any, campaign: any, originalPrompt: string) {
    const townCount = this.getRandomCount(this.config.campaign.townCount)
    
    this.progress.totalSteps += townCount
    this.progress.results.towns = []
    this.emitStepStarted('towns', `Generating ${townCount} towns...`)

    // Build context for town generation
    const contextBuilder = createContextBuilder(this.userId, this.dmId)
      .withCampaign({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        ruleset: campaign.ruleset,
        setting: campaign.setting,
        history: campaign.history,
        currency: campaign.currency,
        pantheon: campaign.pantheon,
      })

    const campaignContext = contextBuilder.buildTownContext()

    // Generate each town
    for (let i = 0; i < townCount; i++) {
      this.emitStepStarted(`town_${i + 1}`, `Generating town ${i + 1} of ${townCount}...`)
      
      const townPrompt = `${originalPrompt} - Town ${i + 1} of ${townCount}. CRITICAL: Do not use these existing town names: ${Array.from(this.generatedNames.towns).join(', ')}`
      
      const townResult = await this.generateTownEntity(
        supabase, 
        campaign.id, 
        townPrompt, 
        campaignContext,
        contextBuilder
      )

      if (townResult.success && townResult.data) {
        this.progress.results.towns.push(townResult.data)
        this.progress.completedSteps++
        this.generatedNames.towns.add(townResult.data.name)
        this.emitEntityCreated('town', townResult.data)
      }
    }
  }

  /**
   * Generate a single town entity
   */
  private async generateTownEntity(
    supabase: any, 
    campaignId: string, 
    prompt: string,
    campaignContext: string,
    parentContextBuilder: any
  ): Promise<GeneratorResult<any>> {
    
    // OpenAI call with timeout
    const openaiPromise = openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TOWN_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildTownGenerationPrompt(prompt, campaignContext) },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })
    
    const completion = await Promise.race([
      openaiPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Town generation timeout')), 60000)
      )
    ])

    const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
    const { town, notablePeople, suggestedShops } = generatedData

    if (!town) {
      return { success: false, error: 'Invalid AI response: missing town data' }
    }

    // Check for duplicate and make unique
    const uniqueName = this.makeUniqueName(town.name, this.generatedNames.towns)
    if (uniqueName !== town.name) {
      console.log(`Renamed duplicate town from "${town.name}" to "${uniqueName}"`)
    }
    
    // Create town
    const townData = truncateFields({
      campaign_id: campaignId,
      dm_id: this.dmId,
      name: uniqueName,
      description: town.description,
      population: town.population,
      size: town.size,
      location: town.location,
      political_system: town.political_system,
      history: town.history,
    }, TOWN_FIELD_MAP)

    const { data: createdTown, error } = await supabase
      .from('towns')
      .insert(townData as any)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Failed to create town: ${error.message}` }
    }

    // Track usage
    await this.trackAIUsage(
      supabase,
      'town',
      prompt,
      {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      },
      'gpt-4o'
    )

    // Update context builder with this town
    const townContextBuilder = createContextBuilder(this.userId, this.dmId)
      .withCampaign(parentContextBuilder.build().campaignContext)
      .withTown({
        id: createdTown.id,
        name: town.name,
        description: town.description,
        population: town.population,
        size: town.size,
        location: town.location,
        political_system: town.political_system,
        history: town.history,
      })

    // Auto-generate Notable People
    if (this.config.town.autoGenerateNotablePeople && notablePeople?.length > 0) {
      await this.generateNotablePeopleForTown(supabase, createdTown.id, notablePeople, townContextBuilder, createdTown.name)
    }

    // Auto-generate Shops
    if (this.config.town.autoGenerateShops) {
      const shopCount = this.getRandomCount(this.config.town.shopCount)
      await this.generateShopsForTown(supabase, campaignId, createdTown.id, shopCount, townContextBuilder, createdTown.name)
    }

    return { success: true, data: createdTown }
  }

  /**
   * Generate notable people for a town
   */
  private async generateNotablePeopleForTown(
    supabase: any,
    townId: string,
    peopleData: any[],
    contextBuilder: any,
    townName: string
  ) {
    const context = contextBuilder.buildNotablePersonContext()
    const peopleCount = this.getRandomCount(this.config.town.notablePeopleCount)
    
    this.emitStepStarted('people', `Creating ${peopleCount} notable people for ${townName}...`)

    for (const person of peopleData.slice(0, peopleCount)) {
      // Check for duplicate name
      const uniqueName = this.makeUniqueName(person.name, this.generatedNames.people)
      if (uniqueName !== person.name) {
        console.log(`Renamed duplicate person from "${person.name}" to "${uniqueName}"`)
      }
      
      const personRecord = truncateFields({
        town_id: townId,
        dm_id: this.dmId,
        name: uniqueName,
        race: person.race,
        role: person.role,
        backstory: person.backstory,
        motivation: person.motivation,
        personality_traits: person.personality_traits || [],
      }, NOTABLE_PERSON_FIELD_MAP)

      const { data: createdPerson } = await supabase
        .from('notable_people')
        .insert(personRecord as any)
        .select()
        .single()

      if (createdPerson) {
        this.generatedNames.people.add(createdPerson.name)
        if (!this.progress.results.notablePeople) {
          this.progress.results.notablePeople = []
        }
        this.progress.results.notablePeople.push(createdPerson)
        this.emitEntityCreated('notable_person', createdPerson)
      }
    }
  }

  /**
   * Generate shops for a town
   */
  private async generateShopsForTown(
    supabase: any,
    campaignId: string,
    townId: string,
    count: number,
    contextBuilder: any,
    townName: string
  ) {
    const context = contextBuilder.buildShopContext()
    
    this.emitStepStarted('shops', `Creating ${count} shops for ${townName}...`)
    this.progress.totalSteps += count

    for (let i = 0; i < count; i++) {
      this.emitStepStarted(`shop_${i + 1}`, `Generating shop ${i + 1} of ${count} for ${townName}...`)
      
      const shopPrompt = `Generate a shop that fits in this town. CRITICAL: Do not use these existing shop names: ${Array.from(this.generatedNames.shops).join(', ')}`

      // OpenAI call with timeout
      const openaiPromise = openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SHOP_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: buildShopGenerationPrompt(shopPrompt) },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      })
      
      const completion = await Promise.race([
        openaiPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Shop generation timeout')), 60000)
        )
      ])

      const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
      const { shop: shopData, items: itemsData } = generatedData

      if (!shopData) {
        console.error('Shop generation failed: no shop data in AI response')
        continue
      }

      // Create shopkeeper as notable person
      const { data: shopkeeper } = await supabase
        .from('notable_people')
        .insert({
          town_id: townId,
          dm_id: this.dmId,
          name: shopData.keeper_name,
          race: shopData.keeper_race,
          role: 'shopkeeper',
          backstory: shopData.keeper_backstory,
          personality_traits: shopData.keeper_personality || [],
        } as any)
        .select()
        .single()

      // Create shop
      const slug = nanoid(SLUG_LENGTH)
      const { data: createdShop, error } = await supabase
        .from('shops')
        .insert({
          campaign_id: campaignId,
          town_id: townId,
          dm_id: this.dmId,
          name: shopData.name,
          slug,
          shop_type: shopData.shop_type,
          location_descriptor: shopData.location_descriptor,
          economic_tier: shopData.economic_tier,
          inventory_volatility: shopData.inventory_volatility,
          notable_person_id: shopkeeper?.id || null,
          keeper_name: shopData.keeper_name,
          keeper_race: shopData.keeper_race,
          keeper_backstory: shopData.keeper_backstory,
          price_modifier: shopData.price_modifier,
          haggle_enabled: shopData.haggle_enabled,
          haggle_dc: shopData.haggle_dc,
          is_active: true,
          is_revealed: true,
        } as any)
        .select()
        .single()

      if (error || !createdShop) {
        console.error('Shop creation failed:', error)
        continue
      }

      this.generatedNames.shops.add(createdShop.name)
      
      if (!this.progress.results.shops) {
        this.progress.results.shops = []
      }
      this.progress.results.shops.push(createdShop)
      this.progress.completedSteps++
      this.emitEntityCreated('shop', createdShop)

      // Track usage
      await this.trackAIUsage(
        supabase,
        'shop',
        shopPrompt,
        {
          input: completion.usage?.prompt_tokens || 0,
          output: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0
        },
        'gpt-4o'
      )

      // Auto-generate items if configured
      if (this.config.shop.autoGenerateItems && itemsData?.length > 0) {
        this.emitStepStarted('items', `Generating ${itemsData.length} items for ${createdShop.name}...`)
        await this.generateItemsForShop(supabase, createdShop.id, itemsData, contextBuilder, createdShop.name)
      }
    }
  }

  /**
   * Generate items for a shop
   */
  private async generateItemsForShop(
    supabase: any,
    shopId: string,
    itemsData: any[],
    contextBuilder: any,
    shopName: string
  ) {
    const itemCount = Math.min(itemsData.length, this.getRandomCount(this.config.shop.itemCount))
    
    this.emitStepStarted('items', `Creating ${itemCount} items for ${shopName}...`)
    this.progress.totalSteps += itemCount
    const itemsToInsert = itemsData.slice(0, itemCount).map((item: any) => ({
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
      .insert(itemsToInsert)
      .select()

    if (itemsError) {
      console.error('Items creation failed:', itemsError)
      return
    }

    if (createdItems) {
      if (!this.progress.results.items) {
        this.progress.results.items = []
      }
      this.progress.results.items.push(...createdItems)
      this.progress.completedSteps += createdItems.length
      
      // Emit each item creation
      for (const item of createdItems) {
        this.emitEntityCreated('item', item)
      }
    }
  }

  /**
   * Get a random count within a range
   */
  private getRandomCount(range: { min: number; max: number }): number {
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
  }
}

export function createOrchestrator(userId: string, dmId: string, options?: GenerationOptions) {
  return new GenerationOrchestrator(userId, dmId, options)
}
