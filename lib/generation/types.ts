/**
 * Generation Orchestrator Types
 * Modern architecture for hierarchical AI content generation
 * Campaign → Towns → (Shops + Notable People) → Items
 */

export interface GenerationConfig {
  campaign: {
    autoGenerateTowns: boolean
    townCount: { min: number; max: number }
  }
  town: {
    autoGenerateShops: boolean
    autoGenerateNotablePeople: boolean
    shopCount: { min: number; max: number }
    notablePeopleCount: { min: number; max: number }
  }
  shop: {
    autoGenerateItems: boolean
    itemCount: { min: number; max: number }
  }
}

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  campaign: {
    autoGenerateTowns: true,
    townCount: { min: 2, max: 4 }
  },
  town: {
    autoGenerateShops: true,
    autoGenerateNotablePeople: true,
    shopCount: { min: 3, max: 5 },
    notablePeopleCount: { min: 3, max: 5 }
  },
  shop: {
    autoGenerateItems: true,
    itemCount: { min: 5, max: 10 }
  }
}

export interface GenerationContext {
  // Hierarchical identifiers
  campaignId?: string
  townId?: string
  shopId?: string
  
  // Accumulated context for AI prompts
  campaignContext?: {
    id: string
    name: string
    description: string
    ruleset?: string
    setting?: string
    history?: string
    currency?: string
    pantheon?: string
  }
  
  townContext?: {
    id: string
    name: string
    description: string
    population?: number
    size?: string
    location?: string
    political_system?: string
    history?: string
  }
  
  shopContext?: {
    id: string
    name: string
    shop_type: string
    economic_tier: string
    location_descriptor?: string
  }
  
  // User who triggered generation
  userId: string
  dmId: string
}

export interface GenerationProgress {
  totalSteps: number
  completedSteps: number
  currentStep: string
  status: 'idle' | 'running' | 'completed' | 'error'
  errors: string[]
  results: {
    campaign?: any
    towns?: any[]
    shops?: any[]
    notablePeople?: any[]
    items?: any[]
  }
}

export interface GenerationStep {
  name: string
  type: 'campaign' | 'town' | 'shop' | 'notable_person' | 'item'
  parentId?: string
  prompt: string
  config?: Partial<GenerationConfig>
}

export type GenerationEvent = 
  | { type: 'step_started'; step: string; progress: GenerationProgress; details?: string }
  | { type: 'step_completed'; step: string; data: any; progress: GenerationProgress }
  | { type: 'step_failed'; step: string; error: string; progress: GenerationProgress }
  | { type: 'entity_created'; entityType: string; entity: any; progress: GenerationProgress }
  | { type: 'completed'; results: GenerationProgress['results'] }
  | { type: 'failed'; error: string; progress?: GenerationProgress }

export interface GenerationOptions {
  config?: Partial<GenerationConfig>
  onProgress?: (event: GenerationEvent) => void
  skipCache?: boolean
}
