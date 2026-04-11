/**
 * Generation Context Builder
 * Builds rich context strings for AI prompts from hierarchical data
 */

import type { GenerationContext } from './types'

export class ContextBuilder {
  private context: GenerationContext

  constructor(userId: string, dmId: string) {
    this.context = { userId, dmId }
  }

  withCampaign(campaign: GenerationContext['campaignContext']) {
    this.context.campaignContext = campaign
    this.context.campaignId = campaign?.id
    return this
  }

  withTown(town: GenerationContext['townContext']) {
    this.context.townContext = town
    this.context.townId = town?.id
    return this
  }

  withShop(shop: GenerationContext['shopContext']) {
    this.context.shopContext = shop
    this.context.shopId = shop?.id
    return this
  }

  build(): GenerationContext {
    return this.context
  }

  /**
   * Build a rich context string for town generation
   * Uses campaign context to inform town creation
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
