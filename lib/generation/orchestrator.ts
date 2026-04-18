/**
 * Generation Orchestrator
 * 
 * @fileoverview
 * Coordinates hierarchical AI content generation for D&D campaigns using OpenAI.
 * Implements a database-first architecture where each generation level independently
 * fetches its required context from Supabase, ensuring consistency and reliability.
 * 
 * @architecture
 * **Database as Single Source of Truth Pattern**
 * - Each generation method fetches its own context from the database
 * - No context passing between methods (eliminates undefined errors)
 * - Same code path whether starting from campaign, town, or shop level
 * 
 * **Hierarchical Generation Flow**
 * ```
 * Campaign → Towns → Shops → Items
 *                 ↓
 *           Notable People
 * ```
 * 
 * **Key Design Patterns**
 * - Strategy Pattern: Each generator (campaign, town, shop) is a strategy
 * - Builder Pattern: ContextBuilder constructs AI prompts from DB data
 * - Observer Pattern: Event emission for real-time progress updates
 * 
 * @example
 * ```typescript
 * const orchestrator = createOrchestrator(userId, dmId)
 * 
 * // Generate entire campaign hierarchy
 * const result = await orchestrator.generateCampaign('A dark fantasy world')
 * 
 * // Generate just a town (fetches campaign context from DB)
 * const townResult = await orchestrator.generateTown(campaignId, 'A coastal trading port')
 * 
 * // Generate just a shop (fetches campaign + town context from DB)
 * const shopResult = await orchestrator.generateShop(campaignId, townId, 'A mysterious apothecary')
 * ```
 * 
 * @see {@link ContextBuilder} for prompt construction
 * @see {@link GenerationConfig} for configuration options
 */

import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { 
  GenerationConfig, 
  DEFAULT_GENERATION_CONFIG, 
  GenerationContext,
  GenerationProgress,
  GenerationEvent,
  GenerationOptions,
  CampaignCurrency
} from './types'
import { ContextBuilder, createContextBuilder } from './context-builder'
import { CAMPAIGN_GENERATION_SYSTEM_PROMPT, buildCampaignGenerationPrompt } from '@/lib/prompts/campaign-generation'
import { TOWN_GENERATION_SYSTEM_PROMPT, buildTownGenerationPrompt } from '@/lib/prompts/town-generation'
import { SHOP_GENERATION_SYSTEM_PROMPT, buildShopGenerationPrompt } from '@/lib/prompts/shop-generation'
import { NOTABLE_PERSON_GENERATION_SYSTEM_PROMPT, buildNotablePersonGenerationPrompt } from '@/lib/prompts/notable-person-generation'
import { truncateFields, CAMPAIGN_FIELD_MAP, TOWN_FIELD_MAP, NOTABLE_PERSON_FIELD_MAP } from '@/lib/utils/truncate-fields'
import { checkRateLimit, skipChildRateLimits } from '@/lib/rate-limit'
import { nanoid } from 'nanoid'
import { SLUG_LENGTH } from '@/lib/constants'

// Validate API key exists before creating client
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not configured')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Result wrapper for generator methods
 * @template T The type of data returned on success
 */
interface GeneratorResult<T> {
  /** Whether the generation succeeded */
  success: boolean
  /** The generated data (only present if success is true) */
  data?: T
  /** Error message (only present if success is false) */
  error?: string
}

/**
 * Main orchestrator class for AI content generation
 * 
 * @class GenerationOrchestrator
 * @description
 * Manages the entire lifecycle of hierarchical content generation for D&D campaigns.
 * Each instance maintains its own progress state and can generate content at any level
 * of the hierarchy (campaign, town, shop, items).
 * 
 * **State Management:**
 * - Tracks generation progress for real-time UI updates
 * - Maintains campaign currency configuration
 * - Prevents duplicate names across generated entities
 * - Logs AI usage for cost tracking
 * 
 * **Thread Safety:**
 * Not thread-safe. Each generation request should use a new orchestrator instance.
 */
export class GenerationOrchestrator {
  /** Generation configuration (counts, auto-generation flags, etc.) */
  private config: GenerationConfig
  
  /** Current generation progress state */
  private progress: GenerationProgress
  
  /** Optional callback for progress updates */
  private callbacks?: GenerationOptions['onProgress']
  
  /** Authenticated user ID */
  private userId: string
  
  /** DM user ID (owner of generated content) */
  private dmId: string
  
  /** Campaign currency system (parsed from campaign data) */
  private campaignCurrencies: CampaignCurrency[] = []
  
  /** Primary currency code (e.g., 'gp', 'credits') */
  private primaryCurrency: string = 'gp'
  
  /** Set of generated names to prevent duplicates */
  private generatedNames = {
    campaigns: new Set<string>(),
    towns: new Set<string>(),
    shops: new Set<string>(),
    people: new Set<string>(),
  }

  /**
   * Creates a new generation orchestrator instance
   * 
   * @param userId - The authenticated user's ID
   * @param dmId - The DM's user ID (content owner)
   * @param options - Optional configuration and callbacks
   * 
   * @example
   * ```typescript
   * const orchestrator = new GenerationOrchestrator(
   *   session.user.id,
   *   session.user.id,
   *   {
   *     config: { campaign: { townCount: [3, 5] } },
   *     onProgress: (event) => console.log(event)
   *   }
   * )
   * ```
   */
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
  
  /**
   * Set the campaign currencies for use during generation
   */
  private setCampaignCurrencies(campaign: any) {
    // Parse currencies from campaign (could be JSONB array or legacy single currency)
    if (campaign.currencies) {
      if (Array.isArray(campaign.currencies)) {
        this.campaignCurrencies = campaign.currencies
      } else if (typeof campaign.currencies === 'object') {
        this.campaignCurrencies = [campaign.currencies]
      }
    } else if (campaign.currency) {
      // Legacy single currency - convert to array format
      this.campaignCurrencies = [{
        code: campaign.currency,
        name: this.getCurrencyName(campaign.currency),
        symbol: campaign.currency,
        base_value: 1,
        is_primary: true,
        is_default: true
      }]
    }
    
    // Find primary currency
    const primary = this.campaignCurrencies.find(c => c.is_primary) || this.campaignCurrencies[0]
    this.primaryCurrency = primary?.code || 'gp'
    
    console.log(`[ORCHESTRATOR] Set campaign currencies: ${this.campaignCurrencies.length} currencies, primary: ${this.primaryCurrency}`)
  }
  
  /**
   * Get full currency name from code
   */
  private getCurrencyName(code: string): string {
    const names: Record<string, string> = {
      'gp': 'Gold Pieces',
      'sp': 'Silver Pieces', 
      'cp': 'Copper Pieces',
      'pp': 'Platinum Pieces',
      'sh': 'Shillings',
      'ep': 'Electrum Pieces'
    }
    return names[code] || code.toUpperCase()
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
   * 
   * @param prompt - Natural language description of the campaign world
   * @param ruleset - Optional RPG system (e.g., '5e', 'pathfinder')
   * @param setting - Optional campaign setting (e.g., 'forgotten realms', 'eberron')
   * @returns Promise resolving to campaign data with all generated entities
   * 
   * @description
   * Generates a complete campaign hierarchy in a single operation:
   * 1. Creates the campaign entity with metadata
   * 2. Generates multiple towns based on configuration
   * 3. For each town, generates shops and notable people
   * 4. For each shop, populates items from library or catalog
   * 
   * **Database Operations:**
   * - Inserts campaign into `campaigns` table
   * - Cascades to create towns, shops, notable_people, and items
   * - All entities are linked via foreign keys
   * 
   * **Progress Tracking:**
   * Emits real-time events for UI updates as each entity is created
   */
  async generateCampaign(prompt: string, ruleset?: string, setting?: string): Promise<GeneratorResult<any>> {
    this.progress.status = 'running'
    this.generatedNames = { campaigns: new Set(), towns: new Set(), shops: new Set(), people: new Set() }
    
    // Progress bar allocation:
    // - 1% for rate limit check
    // - 98% distributed across towns and shops (divided by actual counts)
    // - 1% reserved for final validation
    // Total: 100%
    
    // We'll use a percentage-based system instead of step counting
    this.progress.totalSteps = 100
    this.progress.completedSteps = 0
    
    console.log(`[ORCHESTRATOR] Starting campaign generation with percentage-based progress`)
    
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
      
      // Rate limit check - allocate 1% of progress
      console.log('[RATE_LIMIT] Starting rate limit check for user:', this.userId)
      this.emitStepStarted('rate_limit', 'Checking rate limits...')
      
      const rateLimitStart = Date.now()
      const rateLimitResult = await checkRateLimit(this.userId, 'campaign')
      const rateLimitDuration = Date.now() - rateLimitStart
      
      console.log('[RATE_LIMIT] Check completed in', rateLimitDuration, 'ms')
      console.log('[RATE_LIMIT] Result:', rateLimitResult)
      
      if (!rateLimitResult.allowed) {
        console.error('[RATE_LIMIT] Rate limit exceeded:', rateLimitResult.message)
        throw new Error(rateLimitResult.message || 'Rate limit exceeded. Please wait before generating another campaign.')
      }
      
      console.log('[RATE_LIMIT] Rate limit check passed, proceeding to campaign generation')
      this.progress.completedSteps = 1
      
      this.emitStepStarted('campaign', 'Generating campaign with AI (this takes 10-20 seconds)...')
      console.log('[CAMPAIGN] Starting AI generation with prompt length:', prompt.length)

      // 1. Generate Campaign
      console.log('[CAMPAIGN] Calling generateCampaignEntity...')
      const campaignStart = Date.now()
      const campaignResult = await this.generateCampaignEntity(supabase, prompt, ruleset, setting)
      const campaignDuration = Date.now() - campaignStart
      
      console.log('[CAMPAIGN] Generation completed in', campaignDuration, 'ms')
      console.log('[CAMPAIGN] Result success:', campaignResult.success)
      
      if (!campaignResult.success) {
        console.error('[CAMPAIGN] Generation failed:', campaignResult.error)
        return { success: false, error: campaignResult.error }
      }
      
      console.log('[CAMPAIGN] Campaign created with ID:', campaignResult.data?.id)

      let campaign = campaignResult.data
      this.progress.results.campaign = campaign
      // Campaign generation doesn't increment progress - towns will handle it
      
      // Reload campaign with full data including currencies (in case user edited it previously)
      const { data: fullCampaign, error: reloadError } = await supabase
        .from('campaigns')
        .select('*, currencies')
        .eq('id', campaign.id)
        .single()
      
      if (!reloadError && fullCampaign) {
        campaign = fullCampaign
        this.progress.results.campaign = campaign
        console.log(`[ORCHESTRATOR] Reloaded campaign with currencies:`, campaign.currencies || campaign.currency)
      }
      
      // Set campaign currencies for use in child generations
      this.setCampaignCurrencies(campaign)
      
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
      const err = error as Error
      let errorMsg = err.message
      
      // Provide user-friendly error messages
      if (errorMsg.includes('OPENAI_API_KEY')) {
        errorMsg = 'AI service not configured. Please contact support.'
      } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
        errorMsg = 'Request timed out. Please try again. If this persists, try a shorter prompt.'
      } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        errorMsg = 'Network connection failed. Please check your internet connection and try again.'
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        errorMsg = 'Rate limit exceeded. Please wait a few minutes and try again.'
      } else if (errorMsg.includes('401') || errorMsg.includes('invalid_api_key')) {
        errorMsg = 'AI service authentication failed. Please contact support.'
      }
      
      console.error('[ORCHESTRATOR] Generation error:', error)
      console.error('[ORCHESTRATOR] Error stack:', err.stack)
      console.error('[ORCHESTRATOR] User-friendly message:', errorMsg)
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
    // Rate limit check with aggressive 2-second timeout (pass existing supabase client for speed)
    this.emitStepStarted('rate_limit', 'Checking rate limits...')
    console.log('[ORCHESTRATOR] Starting rate limit check...')
    
    const rateLimitStart = Date.now()
    const rateLimitPromise = checkRateLimit(this.dmId, 'campaign', supabase)
    const rateLimit = await Promise.race([
      rateLimitPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Rate limit check timed out after 2s`)), 2000)
      )
    ])
    
    console.log(`[ORCHESTRATOR] Rate limit check completed in ${Date.now() - rateLimitStart}ms`)
    
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
    const estimatedShopsPerTown = Math.floor((this.config.town.shopCount.min + this.config.town.shopCount.max) / 2)
    
    // Calculate progress allocation:
    // 98% available (1% used for rate limit, 1% reserved for validation)
    // Divide by towns, then subdivide for shops
    const progressPerTown = 98 / townCount
    
    this.progress.results.towns = []
    this.emitStepStarted('towns', `Generating ${townCount} towns...`)
    
    console.log(`[PROGRESS] Allocating ${progressPerTown.toFixed(1)}% per town (${townCount} towns)`)

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
      const townStartProgress = this.progress.completedSteps
      this.emitStepStarted(`town_${i + 1}`, `Generating town ${i + 1} of ${townCount}...`)
      
      const townPrompt = `${originalPrompt} - Town ${i + 1} of ${townCount}. CRITICAL: Do not use these existing town names: ${Array.from(this.generatedNames.towns).join(', ')}`
      
      const townResult = await this.generateTownEntity(
        supabase, 
        campaign.id, 
        townPrompt,
        progressPerTown,
        townStartProgress
      )

      if (townResult.success && townResult.data) {
        this.progress.results.towns.push(townResult.data.town)
        this.generatedNames.towns.add(townResult.data.town.name)
        this.emitEntityCreated('town', townResult.data.town)
        
        // Increment progress by allocated amount for this town
        this.progress.completedSteps = Math.min(townStartProgress + progressPerTown, 98)
      }
    }
    
    // Final validation - use last 1%
    this.emitStepStarted('validation', 'Validating campaign setup...')
    this.progress.completedSteps = 99
    
    // Brief delay for validation step visibility
    await new Promise(resolve => setTimeout(resolve, 500))
    this.progress.completedSteps = 100
  }

  /**
   * Generate a single town entity
   */
  private async generateTownEntity(
    supabase: any, 
    campaignId: string, 
    prompt: string,
    allocatedProgress: number = 0,
    startProgress: number = 0
  ): Promise<GeneratorResult<any>> {
    
    // Fetch campaign context from database (single source of truth)
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    
    if (!campaign) {
      return { success: false, error: 'Campaign not found' }
    }
    
    // Set campaign currencies for this generation
    this.setCampaignCurrencies(campaign)
    
    // Build context from database data
    const contextBuilder = new ContextBuilder(this.userId, this.dmId)
    contextBuilder.withCampaign({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description || '',
      ruleset: campaign.ruleset || undefined,
      setting: campaign.setting || undefined,
      history: campaign.history || undefined,
      currency: this.primaryCurrency,
      currencies: this.campaignCurrencies,
      pantheon: campaign.pantheon || undefined
    })
    
    const campaignContext = contextBuilder.buildTownContext()
    
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

    // Auto-generate Notable People
    if (this.config.town.autoGenerateNotablePeople && notablePeople?.length > 0) {
      await this.generateNotablePeopleForTown(supabase, createdTown.id, notablePeople, createdTown.name)
    }

    // Auto-generate Shops (they will fetch their own context from DB)
    if (this.config.town.autoGenerateShops) {
      const shopCount = this.getRandomCount(this.config.town.shopCount)
      await this.generateShopsForTown(supabase, campaignId, createdTown.id, shopCount, createdTown.name, allocatedProgress, startProgress)
    }

    return { success: true, data: { town: createdTown, notablePeople } }
  }

  /**
   * Generate notable people for a town
   */
  private async generateNotablePeopleForTown(
    supabase: any,
    townId: string,
    peopleData: any[],
    townName: string
  ) {
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
    townName: string,
    allocatedProgress: number = 0,
    startProgress: number = 0
  ) {
    // Fetch campaign and town context from database
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    
    const { data: town } = await supabase
      .from('towns')
      .select('*')
      .eq('id', townId)
      .single()
    
    if (!campaign || !town) {
      console.error('Campaign or town not found for shop generation')
      return
    }
    
    // Set campaign currencies
    this.setCampaignCurrencies(campaign)
    
    // Build context from database
    const contextBuilder = new ContextBuilder(this.userId, this.dmId)
    contextBuilder.withCampaign({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description || '',
      ruleset: campaign.ruleset || undefined,
      setting: campaign.setting || undefined,
      history: campaign.history || undefined,
      currency: this.primaryCurrency,
      currencies: this.campaignCurrencies,
      pantheon: campaign.pantheon || undefined
    }).withTown({
      id: town.id,
      name: town.name,
      description: town.description,
      population: town.population,
      size: town.size,
      location: town.location,
      political_system: town.political_system,
      history: town.history
    })
    
    const context = contextBuilder.buildShopContext()
    
    this.emitStepStarted('shops', `Creating ${count} shops for ${townName}...`)
    
    // Skip rate limit check for shops during campaign generation (campaign check is sufficient)
    const shopRateLimit = skipChildRateLimits()
    
    let shopsCreated = 0
    let shopsAttempted = 0
    const progressPerShop = allocatedProgress / count

    for (let i = 0; i < count; i++) {
      shopsAttempted++
      this.emitStepStarted(`shop_${i + 1}`, `Generating shop ${i + 1} of ${count} for ${townName}...`)
      
      // Update progress incrementally for each shop
      this.progress.completedSteps = Math.min(startProgress + (i * progressPerShop), 98)
      
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
      const { data: shopkeeper, error: shopkeeperError } = await supabase
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

      if (shopkeeperError) {
        console.error(`Shopkeeper creation failed for shop ${i + 1} in ${townName}:`, shopkeeperError)
        // Continue anyway - shop can exist without a linked shopkeeper
      }

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
        console.error(`Shop ${i + 1} creation failed for ${townName}:`, error)
        this.progress.errors.push(`Shop ${i + 1} in ${townName} failed: ${error?.message || 'Unknown error'}`)
        continue
      }
      
      shopsCreated++
      console.log(`✓ Created shop: ${createdShop.name} in ${townName}`)
      this.generatedNames.shops.add(createdShop.name)
      
      if (!this.progress.results.shops) {
        this.progress.results.shops = []
      }
      this.progress.results.shops.push(createdShop)
      // Progress is updated incrementally above, not per shop
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

      // Populate items from library → catalog (no AI item generation)
      if (this.config.shop.autoGenerateItems) {
        const targetCount = this.getRandomCount(this.config.shop.itemCount)

        // 1. Try DM's personal item library first
        const libraryItems = await this.getItemsFromLibrary(supabase, createdShop.shop_type, createdShop.economic_tier, targetCount)
        if (libraryItems.length > 0) {
          console.log(`[ITEMS] Using ${libraryItems.length} library items for ${createdShop.name}`)
          await this.generateItemsForShop(supabase, createdShop.id, libraryItems, createdShop.name)
        } else {
          // 2. Fall back to SRD catalog
          console.log(`[ITEMS] No library items for ${createdShop.shop_type} — falling back to SRD catalog for ${createdShop.name}`)
          const catalogItems = await this.getItemsFromCatalog(supabase, createdShop.shop_type, createdShop.economic_tier, targetCount)
          if (catalogItems.length > 0) {
            await this.generateItemsForShop(supabase, createdShop.id, catalogItems, createdShop.name)
          } else {
            console.warn(`[ITEMS] No catalog items for ${createdShop.shop_type} — shop will start empty`)
            this.progress.errors.push(`No items found for ${createdShop.name} — add items via Item Library`)
          }
        }
      } else {
        console.log(`[ITEMS] Skipping item population for ${createdShop.name} - autoGenerateItems is disabled`)
      }
    }
    
    console.log(`Shop generation complete for ${townName}: ${shopsCreated}/${shopsAttempted} shops created`)
    
    if (shopsCreated === 0 && shopsAttempted > 0) {
      this.progress.errors.push(`WARNING: No shops were created for ${townName} after ${shopsAttempted} attempts`)
    }
  }

  /**
   * Generate items for a shop
   */
  private async generateItemsForShop(
    supabase: any,
    shopId: string,
    itemsData: any[],
    shopName: string
  ) {
    const itemCount = Math.min(itemsData.length, this.getRandomCount(this.config.shop.itemCount))
    
    this.emitStepStarted('items', `Creating ${itemCount} items for ${shopName}...`)
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
      currency_reference: item.currency_reference || this.primaryCurrency,
    }))

    console.log(`[ITEMS] Inserting ${itemsToInsert.length} items into database for ${shopName}...`)
    console.log(`[ITEMS] First item sample:`, JSON.stringify(itemsToInsert[0], null, 2))

    const { data: createdItems, error: itemsError } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select()

    if (itemsError) {
      console.error(`[ITEMS] Database insert failed for ${shopName}:`, itemsError)
      console.error(`[ITEMS] Error code: ${itemsError.code}, Message: ${itemsError.message}`)
      // Add error to progress so user sees it
      this.progress.errors.push(`Failed to create items for ${shopName}: ${itemsError.message}`)
      return
    }

    console.log(`[ITEMS] Successfully created ${createdItems?.length || 0} items for ${shopName}`)

    if (createdItems && createdItems.length > 0) {
      if (!this.progress.results.items) {
        this.progress.results.items = []
      }
      this.progress.results.items.push(...createdItems)
      // Progress is handled at shop level, not per item
      
      // Emit each item creation
      for (const item of createdItems) {
        this.emitEntityCreated('item', item)
      }
    } else {
      console.warn(`[ITEMS] No items returned from insert for ${shopName}`)
    }
  }

  /**
   * Fetch items from the DM's personal item_library for a given shop type.
   * Returns mapped items ready for generateItemsForShop.
   */
  private async getItemsFromLibrary(
    supabase: any,
    shopType: string,
    economicTier: string,
    count: number
  ): Promise<any[]> {
    try {
      const { data: libraryItems, error } = await supabase
        .from('item_library')
        .select('*')
        .eq('dm_id', this.dmId)
        .contains('shop_tags', [shopType])
        .limit(100)

      if (error || !libraryItems || libraryItems.length === 0) return []

      const shuffled = [...libraryItems].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, count)

      return selected.map((item: any) => ({
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        base_price_gp: item.base_price_gp,
        weight_lbs: item.weight_lbs,
        stock_quantity: this.getStockQuantityForTier(economicTier),
        is_hidden: false,
        hidden_condition: null,
        attunement_required: item.attunement_required,
        cursed: item.cursed,
        identified: true,
        properties: item.properties,
        currency_reference: this.primaryCurrency,
      }))
    } catch (err) {
      console.error(`[LIBRARY] Exception fetching library items:`, err)
      return []
    }
  }

  /**
   * Fetch random items from the catalog for a given shop type.
   * This is the guaranteed fallback when AI generation returns no valid items.
   */
  private async getItemsFromCatalog(
    supabase: any,
    shopType: string,
    economicTier: string,
    count: number
  ): Promise<any[]> {
    try {
      const { data: catalogItems, error } = await supabase
        .from('catalog_items')
        .select('*')
        .contains('shop_tags', [shopType])
        .eq('ruleset', '5e')
        .limit(100)

      if (error) {
        console.error(`[CATALOG] Failed to fetch items for shop type '${shopType}':`, error.message)
        return []
      }

      if (!catalogItems || catalogItems.length === 0) {
        console.warn(`[CATALOG] No catalog items found for shop type '${shopType}'`)
        return []
      }

      // Shuffle client-side (PostgREST doesn't support ORDER BY RANDOM())
      const shuffled = [...catalogItems].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, count)

      console.log(`[CATALOG] Selected ${selected.length}/${catalogItems.length} catalog items for '${shopType}' (${economicTier})`)

      return selected.map((item: any) => ({
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        base_price_gp: item.base_price,
        weight_lbs: item.weight,
        stock_quantity: this.getStockQuantityForTier(economicTier),
        is_hidden: false,
        hidden_condition: null,
        attunement_required: item.requires_attunement,
        cursed: false,
        identified: true,
        properties: item.system_stats,
        currency_reference: this.primaryCurrency,
      }))
    } catch (err) {
      console.error(`[CATALOG] Exception fetching catalog items:`, err)
      return []
    }
  }

  /**
   * Get appropriate stock quantity based on shop economic tier.
   */
  private getStockQuantityForTier(tier: string): number {
    const quantities: Record<string, number> = {
      poor: 1,
      modest: 2,
      comfortable: 3,
      wealthy: 4,
      opulent: 5,
    }
    return quantities[tier] || 2
  }

  /**
   * Get a random count within a range
   */
  private getRandomCount(range: { min: number; max: number }): number {
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
  }

  /**
   * Generate a town with cascading shops, people, and items
   * Entry point for town-level generation
   */
  async generateTown(campaignId: string, prompt: string): Promise<GeneratorResult<any>> {
    this.progress.status = 'running'
    this.generatedNames = { campaigns: new Set(), towns: new Set(), shops: new Set(), people: new Set() }
    
    // Calculate estimated steps
    const estimatedShops = Math.floor((this.config.town.shopCount.min + this.config.town.shopCount.max) / 2)
    const estimatedItemsPerShop = Math.floor((this.config.shop.itemCount.min + this.config.shop.itemCount.max) / 2)
    const estimatedPeople = Math.floor((this.config.town.notablePeopleCount.min + this.config.town.notablePeopleCount.max) / 2)
    
    // Total: 1 town + shops + people + (items per shop)
    this.progress.totalSteps = 1 + estimatedShops + estimatedPeople + (estimatedShops * estimatedItemsPerShop)
    
    console.log(`[ORCHESTRATOR] Town generation - Estimated steps: ${this.progress.totalSteps}`)
    
    try {
      this.emitStepStarted('init', 'Connecting to database...')
      const supabase = await createClient()
      
      // Get campaign context
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('dm_id', this.dmId)
        .single()
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' }
      }
      
      this.setCampaignCurrencies(campaign)
      
      // Generate town (it will fetch campaign context from DB)
      this.emitStepStarted('town', 'Generating town with AI...')
      const townResult = await this.generateTownEntity(supabase, campaignId, prompt)
      
      if (!townResult.success || !townResult.data) {
        return { success: false, error: townResult.error }
      }
      
      const town = townResult.data.town
      const notablePeople = townResult.data.notablePeople || []
      
      // Store in results as towns array for consistency
      if (!this.progress.results.towns) {
        this.progress.results.towns = []
      }
      this.progress.results.towns.push(town)
      this.progress.completedSteps++
      
      // Generate notable people
      if (this.config.town.autoGenerateNotablePeople && notablePeople.length > 0) {
        await this.generateNotablePeopleForTown(supabase, town.id, notablePeople, town.name)
      }
      
      // Generate shops with items (they will fetch their own context from DB)
      if (this.config.town.autoGenerateShops) {
        const shopCount = this.getRandomCount(this.config.town.shopCount)
        await this.generateShopsForTown(supabase, campaignId, town.id, shopCount, town.name)
      }
      
      this.progress.status = 'completed'
      this.emit({ type: 'completed', results: this.progress.results })
      
      return { success: true, data: this.progress.results }
    } catch (error) {
      const errorMsg = (error as Error).message
      console.error('Town generation error:', error)
      this.progress.status = 'error'
      this.progress.errors.push(errorMsg)
      this.emit({ type: 'failed', error: errorMsg, progress: { ...this.progress } })
      
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Generate a shop with cascading items
   * Entry point for shop-level generation
   */
  async generateShop(campaignId: string, townId: string | null, prompt: string, createNotablePerson: boolean = true, notablePersonId?: string): Promise<GeneratorResult<any>> {
    this.progress.status = 'running'
    this.generatedNames = { campaigns: new Set(), towns: new Set(), shops: new Set(), people: new Set() }
    
    // Calculate estimated steps
    const estimatedItems = Math.floor((this.config.shop.itemCount.min + this.config.shop.itemCount.max) / 2)
    
    // Total: 1 shop + items
    this.progress.totalSteps = 1 + estimatedItems
    
    console.log(`[ORCHESTRATOR] Shop generation - Estimated steps: ${this.progress.totalSteps}`)
    
    try {
      this.emitStepStarted('init', 'Connecting to database...')
      const supabase = await createClient()
      
      // Get campaign context
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('dm_id', this.dmId)
        .single()
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' }
      }
      
      this.setCampaignCurrencies(campaign)
      
      // Build context
      const contextBuilder = new ContextBuilder(this.userId, this.dmId)
      contextBuilder.withCampaign({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description || '',
        ruleset: campaign.ruleset || undefined,
        setting: campaign.setting || undefined,
        history: campaign.history || undefined,
        currency: this.primaryCurrency,
        currencies: this.campaignCurrencies,
        pantheon: campaign.pantheon || undefined
      })
      
      // Get town context if provided
      if (townId) {
        const { data: town } = await supabase
          .from('towns')
          .select('*')
          .eq('id', townId)
          .eq('dm_id', this.dmId)
          .single()
        
        if (town) {
          contextBuilder.withTown({
            id: town.id,
            name: town.name,
            description: town.description || '',
            population: town.population || undefined,
            size: town.size || undefined,
            location: town.location || undefined,
            political_system: town.political_system || undefined,
            history: town.history || undefined
          })
        }
      }
      
      // Generate shop
      this.emitStepStarted('shop', 'Generating shop with AI...')
      
      const context = contextBuilder.buildShopContext()
      const shopPrompt = `Generate a shop that fits in this setting. ${prompt}`
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SHOP_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: buildShopGenerationPrompt(shopPrompt) },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      })
      
      const generatedData = JSON.parse(completion.choices[0].message.content || '{}')
      const { shop: shopData, items: itemsData } = generatedData
      
      if (!shopData) {
        return { success: false, error: 'Failed to generate shop data' }
      }
      
      // Create shopkeeper as notable person if requested
      let shopkeeperId = notablePersonId
      if (createNotablePerson && !notablePersonId && townId) {
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
        
        if (shopkeeper) {
          shopkeeperId = shopkeeper.id
        }
      }
      
      // Create shop
      const slug = nanoid(SLUG_LENGTH)
      const { data: createdShop, error: shopError } = await supabase
        .from('shops')
        .insert({
          campaign_id: campaignId,
          town_id: townId || null,
          dm_id: this.dmId,
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
      
      if (shopError || !createdShop) {
        return { success: false, error: shopError?.message || 'Failed to create shop' }
      }
      
      // Store in results as shops array for consistency
      if (!this.progress.results.shops) {
        this.progress.results.shops = []
      }
      this.progress.results.shops.push(createdShop)
      this.progress.completedSteps++
      
      // Generate items if configured
      if (this.config.shop.autoGenerateItems) {
        const targetCount = this.getRandomCount(this.config.shop.itemCount)
        
        // Try library first, then catalog
        const libraryItems = await this.getItemsFromLibrary(supabase, createdShop.shop_type, createdShop.economic_tier, targetCount)
        if (libraryItems.length > 0) {
          await this.generateItemsForShop(supabase, createdShop.id, libraryItems, createdShop.name)
        } else {
          const catalogItems = await this.getItemsFromCatalog(supabase, createdShop.shop_type, createdShop.economic_tier, targetCount)
          if (catalogItems.length > 0) {
            await this.generateItemsForShop(supabase, createdShop.id, catalogItems, createdShop.name)
          }
        }
      }
      
      this.progress.status = 'completed'
      this.emit({ type: 'completed', results: this.progress.results })
      
      return { success: true, data: this.progress.results }
    } catch (error) {
      const errorMsg = (error as Error).message
      console.error('Shop generation error:', error)
      this.progress.status = 'error'
      this.progress.errors.push(errorMsg)
      this.emit({ type: 'failed', error: errorMsg, progress: { ...this.progress } })
      
      return { success: false, error: errorMsg }
    }
  }
}

export function createOrchestrator(userId: string, dmId: string, options?: GenerationOptions) {
  return new GenerationOrchestrator(userId, dmId, options)
}
