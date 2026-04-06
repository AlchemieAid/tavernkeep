import { FIELD_LIMITS } from '@/lib/constants/field-limits'

export const TOWN_GENERATION_SYSTEM_PROMPT = `Expert D&D world builder. Create vivid, memorable towns with rich detail.

Output JSON:
{
  "town": {
    "name": "Town Name (max ${FIELD_LIMITS.TOWN_NAME} chars)",
    "description": "2-3 sentences: atmosphere, key feature, what it's known for (max ${FIELD_LIMITS.TOWN_DESCRIPTION} chars)",
    "population": 500,
    "size": "hamlet|village|town|city|metropolis",
    "location": "desert|forest|wilderness|necropolis|arctic|plains|riverside|coastal|mountain|swamp|underground|floating|jungle",
    "political_system": "monarchy|democracy|oligarchy|theocracy|anarchy|military|tribal|merchant_guild|magocracy",
    "history": "2-3 sentences of town history and notable events (max ${FIELD_LIMITS.TOWN_HISTORY} chars)"
  },
  "notablePeople": [
    {
      "name": "Full Name (max ${FIELD_LIMITS.NOTABLE_PERSON_NAME} chars)",
      "race": "Race (max ${FIELD_LIMITS.NOTABLE_PERSON_RACE} chars)",
      "role": "ruler|priest|magician|merchant|guard|noble|commoner|blacksmith|innkeeper|healer|scholar|criminal|artisan|quest_giver",
      "backstory": "2-3 sentences (max ${FIELD_LIMITS.NOTABLE_PERSON_BACKSTORY} chars)",
      "motivation": "1-2 sentences (max ${FIELD_LIMITS.NOTABLE_PERSON_MOTIVATION} chars)",
      "personality_traits": ["Single-word trait 1", "Single-word trait 2", "Single-word trait 3"]
    }
  ],
  "suggestedShops": [
    {"name": "Shop Name (max ${FIELD_LIMITS.SHOP_NAME} chars)", "shop_type": "general|weapons|armor|magic|apothecary|black_market", "description": "1 sentence unique trait"}
  ]
}

CRITICAL: 
- Respect all character limits strictly. Keep content concise and impactful.
- ALWAYS include at least one notable person with role "ruler" who leads the town
- The ruler's name should match the town's political system and setting
- Generate 2-4 additional notable people with diverse roles (priest, merchant, innkeeper, etc.)
- Ensure all elements feel cohesive and support the town's character.`

export function buildTownGenerationPrompt(
  userPrompt: string, 
  campaignContext?: string,
  population?: number,
  size?: string,
  location?: string
): string {
  const contextPart = campaignContext ? `\nCampaign: ${campaignContext}` : ''
  const populationPart = population ? `\nPopulation: ~${population}` : ''
  const sizePart = size ? `\nSize: ${size}` : ''
  const locationPart = location ? `\nLocation: ${location}` : ''
  
  return `D&D town: "${userPrompt}"${contextPart}${populationPart}${sizePart}${locationPart}

Requirements:
- Fitting name
- 2-3 sentence description (atmosphere, landmark, specialty)
- Appropriate population (hamlet: 20-100, village: 100-1000, town: 1000-5000, city: 5000-25000, metropolis: 25000+)
- Geographic size classification
- Geographic location type
- Form of government
- 2-3 sentences of town history
- 3-5 notable people including:
  * REQUIRED: One ruler/leader (role: "ruler")
  * 2-4 other diverse roles (priest, merchant, innkeeper, healer, etc.)
  * Each with name, race, backstory, motivation, and single-word personality traits (e.g., "Brave", "Cunning")
- 3-6 shops with types and 1-sentence traits

Be atmospheric and specific. Ensure all elements feel cohesive.`
}
