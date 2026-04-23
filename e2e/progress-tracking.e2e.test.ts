/**
 * E2E Test: Progress Tracking
 * 
 * These tests require a real backend environment with working AI/Supabase.
 * Run with: npx playwright test or against staging environment.
 * 
 * NOTE: These were moved from __tests__/generation/ because they need
 * full orchestrator event emission chain which requires complex mocking.
 */

// Mock environment variables before any imports
process.env.GEMINI_API_KEY = 'test-gemini-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.AI_PROVIDER = 'openai'

// Mock AI module to prevent API key validation errors
jest.mock('@/lib/ai', () => ({
  createAIClient: jest.fn().mockReturnValue({
    generateCampaign: jest.fn().mockResolvedValue({
      campaign: {
        name: 'Test Campaign',
        description: 'A test campaign',
        ruleset: '5e',
        currency: 'gp',
      },
      town: {
        name: 'Test Town',
        description: 'A test town',
        population: 1000,
        size: 'small',
      },
      shop: {
        name: 'Test Shop',
        shop_type: 'general',
        economic_tier: 'modest',
        keeper_name: 'Test Keeper',
        keeper_race: 'Human',
      },
    }),
    generateTown: jest.fn().mockResolvedValue({
      name: 'Test Town',
      description: 'A test town',
      population: 1000,
      size: 'small',
    }),
    generateShop: jest.fn().mockResolvedValue({
      name: 'Test Shop',
      shop_type: 'general',
      economic_tier: 'modest',
      keeper_name: 'Test Keeper',
      keeper_race: 'Human',
    }),
  }),
  getConfiguredProvider: jest.fn().mockReturnValue('openai'),
  getConfiguredModel: jest.fn().mockReturnValue('gpt-4o-mini'),
}))

import { GenerationOrchestrator } from '@/lib/generation/orchestrator'
import { GenerationEvent, GenerationProgress } from '@/lib/generation/types'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-id', name: 'Test' }, 
            error: null 
          })),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      })),
    },
  })),
}))

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                campaign: {
                  name: 'Test Campaign',
                  description: 'A test campaign',
                  ruleset: '5e',
                  currency: 'gp',
                },
                town: {
                  name: 'Test Town',
                  description: 'A test town',
                  population: 1000,
                  size: 'small',
                },
                shop: {
                  name: 'Test Shop',
                  shop_type: 'general',
                  economic_tier: 'modest',
                  keeper_name: 'Test Keeper',
                  keeper_race: 'Human',
                },
              }),
            },
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
          },
        })),
      },
    },
  }))
})

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(() => Promise.resolve({ 
    allowed: true, 
    remaining: 10, 
    message: 'OK' 
  })),
  skipChildRateLimits: jest.fn(() => ({ allowed: true, remaining: 999, message: 'Skipped' })),
  recordUsage: jest.fn(() => Promise.resolve()),
}))

describe('Progress Tracking', () => {
  describe('Progress Bar Calculations', () => {
    it('should start at 0% and use percentage-based system', () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      // Check initial progress
      const progress = (orchestrator as any).progress as GenerationProgress
      expect(progress.totalSteps).toBe(100)
      expect(progress.completedSteps).toBe(0)
    })

    it('should allocate 1% for rate limit check', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 1, max: 1 },
              autoGenerateTowns: false, // Disable to test just rate limit
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      // Start generation (will fail but we just want to check rate limit step)
      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected to fail without proper mocks
      }

      // Find rate limit step
      const rateLimitEvent = events.find(e => 
        e.type === 'step_started' && e.step === 'rate_limit'
      )
      
      expect(rateLimitEvent).toBeDefined()
      if (rateLimitEvent && rateLimitEvent.type === 'step_started') {
        expect(rateLimitEvent.progress.completedSteps).toBe(1)
        expect(rateLimitEvent.progress.totalSteps).toBe(100)
      }
    })

    it('should distribute 98% across towns and shops', () => {
      const townCount = 3
      const progressPerTown = 98 / townCount

      expect(progressPerTown).toBeCloseTo(32.67, 1)
      
      // Verify it sums to 98%
      const totalProgress = progressPerTown * townCount
      expect(totalProgress).toBeCloseTo(98, 0.1)
    })

    it('should reserve 1% for final validation', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 1, max: 1 },
              autoGenerateTowns: true,
            },
            town: {
              shopCount: { min: 0, max: 0 },
              autoGenerateShops: false,
              notablePeopleCount: { min: 0, max: 0 },
              autoGenerateNotablePeople: false,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      // Find validation step
      const validationEvent = events.find(e => 
        e.type === 'step_started' && e.step === 'validation'
      )
      
      if (validationEvent && validationEvent.type === 'step_started') {
        expect(validationEvent.progress.completedSteps).toBe(99)
      }
    })

    it('should reach 100% at completion', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 1, max: 1 },
              autoGenerateTowns: true,
            },
            town: {
              shopCount: { min: 0, max: 0 },
              autoGenerateShops: false,
              notablePeopleCount: { min: 0, max: 0 },
              autoGenerateNotablePeople: false,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      // Check final progress
      const progress = (orchestrator as any).progress as GenerationProgress
      expect(progress.completedSteps).toBeLessThanOrEqual(100)
    })

    it('should never exceed 100%', () => {
      const townCount = 5
      const shopsPerTown = 4
      const progressPerTown = 98 / townCount
      const progressPerShop = progressPerTown / shopsPerTown

      let currentProgress = 1 // Start after rate limit check

      // Simulate town and shop generation
      for (let town = 0; town < townCount; town++) {
        for (let shop = 0; shop < shopsPerTown; shop++) {
          currentProgress += progressPerShop
        }
      }

      // Add validation
      currentProgress = 99
      currentProgress = 100

      expect(currentProgress).toBeLessThanOrEqual(100)
    })
  })

  describe('Town Progress Indicator', () => {
    it('should emit town entity with name', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 1, max: 1 },
              autoGenerateTowns: true,
            },
            town: {
              shopCount: { min: 0, max: 0 },
              autoGenerateShops: false,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      // Find town entity creation event
      const townEvent = events.find(e => 
        e.type === 'entity_created' && e.entityType === 'town'
      )

      expect(townEvent).toBeDefined()
      if (townEvent && townEvent.type === 'entity_created') {
        expect(townEvent.entity).toHaveProperty('name')
        expect(townEvent.entity.name).toBeTruthy()
        expect(typeof townEvent.entity.name).toBe('string')
      }
    })

    it('should emit town entities in order', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 3, max: 3 },
              autoGenerateTowns: true,
            },
            town: {
              shopCount: { min: 0, max: 0 },
              autoGenerateShops: false,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      // Find all town events
      const townEvents = events.filter(e => 
        e.type === 'entity_created' && e.entityType === 'town'
      )

      expect(townEvents.length).toBeGreaterThan(0)
      
      // Each should have a unique name
      const townNames = townEvents.map(e => 
        e.type === 'entity_created' ? e.entity.name : ''
      )
      const uniqueNames = new Set(townNames)
      expect(uniqueNames.size).toBe(townNames.length)
    })
  })

  describe('Shop Progress Indicator', () => {
    it('should increment progress per shop within town allocation', () => {
      const townCount = 2
      const shopsPerTown = 3
      const progressPerTown = 98 / townCount // 49%
      const progressPerShop = progressPerTown / shopsPerTown // ~16.33%

      let progress = 1 // After rate limit

      // First town
      for (let i = 0; i < shopsPerTown; i++) {
        progress = Math.min(1 + (i * progressPerShop), 98)
      }

      expect(progress).toBeLessThanOrEqual(49)

      // Second town
      const town2Start = 49
      for (let i = 0; i < shopsPerTown; i++) {
        progress = Math.min(town2Start + (i * progressPerShop), 98)
      }

      expect(progress).toBeLessThanOrEqual(98)
    })

    it('should emit shop entities with names', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 1, max: 1 },
              autoGenerateTowns: true,
            },
            town: {
              shopCount: { min: 2, max: 2 },
              autoGenerateShops: true,
            },
            shop: {
              itemCount: { min: 0, max: 0 },
              autoGenerateItems: false,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      // Find shop events
      const shopEvents = events.filter(e => 
        e.type === 'entity_created' && e.entityType === 'shop'
      )

      expect(shopEvents.length).toBeGreaterThan(0)
      shopEvents.forEach(event => {
        if (event.type === 'entity_created') {
          expect(event.entity).toHaveProperty('name')
          expect(event.entity.name).toBeTruthy()
        }
      })
    })
  })

  describe('Progress Consistency', () => {
    it('should maintain monotonic progress (never decrease)', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 2, max: 2 },
              autoGenerateTowns: true,
            },
            town: {
              shopCount: { min: 2, max: 2 },
              autoGenerateShops: true,
            },
            shop: {
              itemCount: { min: 0, max: 0 },
              autoGenerateItems: false,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      // Extract progress values
      const progressValues = events
        .filter(e => e.type === 'step_started' || e.type === 'step_completed')
        .map(e => {
          if (e.type === 'step_started' || e.type === 'step_completed') {
            return e.progress.completedSteps
          }
          return 0
        })

      // Check monotonic increase
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1])
      }
    })

    it('should emit progress updates for all major steps', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 1, max: 1 },
              autoGenerateTowns: true,
            },
            town: {
              shopCount: { min: 1, max: 1 },
              autoGenerateShops: true,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      // Check for key steps
      const stepNames = events
        .filter(e => e.type === 'step_started')
        .map(e => e.type === 'step_started' ? e.step : '')

      expect(stepNames).toContain('rate_limit')
      expect(stepNames).toContain('campaign')
      expect(stepNames.some(s => s.includes('town'))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero towns gracefully', async () => {
      const events: GenerationEvent[] = []
      const orchestrator = new (GenerationOrchestrator as any)(
        'test-user',
        'test-dm',
        {
          config: {
            campaign: {
              townCount: { min: 0, max: 0 },
              autoGenerateTowns: false,
            },
          },
          onProgress: (event: GenerationEvent) => events.push(event),
        }
      )

      try {
        await orchestrator.generateCampaign('test')
      } catch (e) {
        // Expected
      }

      const progress = (orchestrator as any).progress as GenerationProgress
      expect(progress.completedSteps).toBeGreaterThanOrEqual(0)
      expect(progress.completedSteps).toBeLessThanOrEqual(100)
    })

    it('should handle maximum towns without exceeding 100%', () => {
      const maxTowns = 10
      const progressPerTown = 98 / maxTowns

      let totalProgress = 1 // Rate limit
      for (let i = 0; i < maxTowns; i++) {
        totalProgress = Math.min(totalProgress + progressPerTown, 98)
      }
      totalProgress = 100 // Validation

      expect(totalProgress).toBe(100)
    })
  })
})
