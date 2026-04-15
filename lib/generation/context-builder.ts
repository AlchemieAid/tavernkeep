/**
 * Generation Context Builder
 * 
 * @fileoverview
 * Implements the Builder pattern to construct rich, hierarchical context strings
 * for AI prompts. Transforms database entities into natural language descriptions
 * that guide AI generation to be consistent with parent entities.
 * 
 * @architecture
 * **Builder Pattern**
 * ```typescript
 * const context = new ContextBuilder(userId, dmId)
 *   .withCampaign(campaign)  // Add campaign layer
 *   .withTown(town)          // Add town layer
 *   .buildShopContext()      // Generate prompt string
 * ```
 * 
 * **Context Hierarchy**
 * ```
 * Campaign Context
 *   ├─ name, description, ruleset, setting
 *   ├─ history, currency, pantheon
 *   └─ Town Context
 *       ├─ name, description, population, size
 *       ├─ location, political_system, history
 *       └─ Shop Context
 *           ├─ name, shop_type, economic_tier
 *           └─ location_descriptor
 * ```
 * 
 * @example
 * ```typescript
 * // Build context for shop generation
 * const builder = new ContextBuilder(userId, dmId)
 * builder.withCampaign({
 *   name: 'Shadows of Eldoria',
 *   setting: 'Dark fantasy',
 *   currency: 'gp'
 * })
 * builder.withTown({
 *   name: 'Ravencrest',
 *   population: 5000,
 *   size: 'medium'
 * })
 * 
 * const contextString = builder.buildShopContext()
 * // Returns:
 * // "Campaign: Shadows of Eldoria
 * //  World Setting: Dark fantasy
 * //  Currency: gp
 * //  
 * //  Town: Ravencrest
 * //  Population: 5000
 * //  Size: medium"
 * ```
 */

import type { GenerationContext } from './types'

/**
 * Builder class for constructing AI generation context
 * 
 * @class ContextBuilder
 * @description
 * Accumulates hierarchical context data and transforms it into formatted
 * strings for AI prompts. Each `with*` method adds a layer to the context,
 * and `build*Context` methods generate the final prompt strings.
 * 
 * **Fluent Interface:**
 * All `with*` methods return `this` for method chaining.
 * 
 * **Immutability:**
 * The builder mutates internal state but returns a new context object
 * when `build()` is called.
 */
export class ContextBuilder {
  /** Internal context accumulator */
  private context: GenerationContext

  /**
   * Creates a new context builder
   * 
   * @param userId - Authenticated user ID
   * @param dmId - DM user ID (content owner)
   */
  constructor(userId: string, dmId: string) {
    this.context = { userId, dmId }
  }

  /**
   * Add campaign context to the builder
   * 
   * @param campaign - Campaign data from database
   * @returns this (for method chaining)
   * 
   * @description
   * Stores campaign metadata that will be included in all child entity
   * prompts (towns, shops, items). This ensures generated content is
   * consistent with the campaign's theme and rules.
   */
  withCampaign(campaign: GenerationContext['campaignContext']) {
    this.context.campaignContext = campaign
    this.context.campaignId = campaign?.id
    return this
  }

  /**
   * Add town context to the builder
   * 
   * @param town - Town data from database
   * @returns this (for method chaining)
   * 
   * @description
   * Stores town metadata that will be included in shop and item prompts.
   * Ensures shops fit the town's size, economy, and culture.
   */
  withTown(town: GenerationContext['townContext']) {
    this.context.townContext = town
    this.context.townId = town?.id
    return this
  }

  /**
   * Add shop context to the builder
   * 
   * @param shop - Shop data from database
   * @returns this (for method chaining)
   * 
   * @description
   * Stores shop metadata for item generation. Ensures items match
   * the shop's type, economic tier, and theme.
   */
  withShop(shop: GenerationContext['shopContext']) {
    this.context.shopContext = shop
    this.context.shopId = shop?.id
    return this
  }

  /**
   * Get the raw context object
   * 
   * @returns Complete generation context with all layers
   */
  build(): GenerationContext {
    return this.context
  }

  /**
   * Build a formatted context string for town generation
   * 
   * @returns Multi-line string describing campaign context
   * 
   * @description
   * Transforms campaign data into a natural language description that
   * guides the AI to generate towns consistent with the campaign world.
   * 
   * **Included Fields:**
   * - Campaign name and description
   * - Ruleset (e.g., D&D 5e, Pathfinder)
   * - Setting (e.g., Forgotten Realms, homebrew)
   * - History and lore
   * - Currency system
   * - Pantheon/deities
   * 
   * @example
   * ```typescript
   * builder.withCampaign({ name: 'Eldoria', setting: 'Dark fantasy' })
   * builder.buildTownContext()
   * // Returns: "Campaign: Eldoria\nSetting: Dark fantasy"
   * ```
   */
  buildTownContext(): string {
    const ctx = this.context
    const parts: string[] = []

    if (ctx.campaignContext) {
      const c = ctx.campaignContext
      parts.push(`Campaign: ${c.name}`)
      if (c.description) parts.push(`Description: ${c.description}`)
      if (c.ruleset) parts.push(`Ruleset: ${c.ruleset}`)
      if (c.setting) parts.push(`Setting: ${c.setting}`)
      if (c.history) parts.push(`History: ${c.history}`)
      if (c.currency) parts.push(`Currency: ${c.currency}`)
      if (c.pantheon) parts.push(`Pantheon: ${c.pantheon}`)
    }

    return parts.join('\n')
  }

  /**
   * Build a rich context string for shop generation
   * Uses both campaign and town context
   */
  buildShopContext(): string {
    const ctx = this.context
    const parts: string[] = []

    // Campaign context
    if (ctx.campaignContext) {
      const c = ctx.campaignContext
      parts.push(`Campaign: ${c.name}`)
      if (c.setting) parts.push(`World Setting: ${c.setting}`)
      if (c.ruleset) parts.push(`Ruleset: ${c.ruleset}`)
      if (c.currency) parts.push(`Currency: ${c.currency}`)
    }

    // Town context
    if (ctx.townContext) {
      const t = ctx.townContext
      parts.push(`\nTown: ${t.name}`)
      if (t.description) parts.push(`Description: ${t.description}`)
      if (t.population) parts.push(`Population: ${t.population}`)
      if (t.size) parts.push(`Size: ${t.size}`)
      if (t.location) parts.push(`Location: ${t.location}`)
      if (t.political_system) parts.push(`Government: ${t.political_system}`)
      if (t.history) parts.push(`History: ${t.history}`)
    }

    return parts.join('\n')
  }

  /**
   * Build a rich context string for notable person generation
   */
  buildNotablePersonContext(): string {
    const ctx = this.context
    const parts: string[] = []

    // Campaign context
    if (ctx.campaignContext) {
      const c = ctx.campaignContext
      parts.push(`Campaign: ${c.name}`)
      if (c.setting) parts.push(`Setting: ${c.setting}`)
    }

    // Town context
    if (ctx.townContext) {
      const t = ctx.townContext
      parts.push(`\nTown: ${t.name}`)
      if (t.description) parts.push(`Description: ${t.description}`)
      if (t.size) parts.push(`Size: ${t.size}`)
      if (t.political_system) parts.push(`Government: ${t.political_system}`)
    }

    return parts.join('\n')
  }

  /**
   * Build a rich context string for item generation
   */
  buildItemContext(): string {
    const ctx = this.context
    const parts: string[] = []

    // Campaign context (for currency)
    if (ctx.campaignContext?.currency) {
      parts.push(`Currency: ${ctx.campaignContext.currency}`)
    }

    // Town context
    if (ctx.townContext) {
      const t = ctx.townContext
      parts.push(`Town: ${t.name}`)
      if (t.size) {
        parts.push(`Size: ${t.size}`)
      }
    }

    // Shop context
    if (ctx.shopContext) {
      const s = ctx.shopContext
      parts.push(`\nShop: ${s.name}`)
      parts.push(`Type: ${s.shop_type}`)
      parts.push(`Economic Tier: ${s.economic_tier}`)
      if (s.location_descriptor) {
        parts.push(`Location: ${s.location_descriptor}`)
      }
    }

    return parts.join('\n')
  }

  /**
   * Build context for the next level down
   */
  buildForLevel(level: 'town' | 'shop' | 'notable_person' | 'item'): string {
    switch (level) {
      case 'town':
        return this.buildTownContext()
      case 'shop':
        return this.buildShopContext()
      case 'notable_person':
        return this.buildNotablePersonContext()
      case 'item':
        return this.buildItemContext()
      default:
        return ''
    }
  }
}

export function createContextBuilder(userId: string, dmId: string) {
  return new ContextBuilder(userId, dmId)
}
