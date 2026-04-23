/**
 * Mock for @google/genai
 * 
 * Jest can't handle ES modules from this package, so we mock it entirely.
 */

export class GoogleGenAI {
  constructor(config: { apiKey: string }) {
    // Mock constructor
  }

  models = {
    generateContent: jest.fn().mockResolvedValue({
      text: JSON.stringify({
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
    }),
  }
}

export default GoogleGenAI
