export const TOWN_GENERATION_SYSTEM_PROMPT = `Expert D&D world builder. Create vivid, memorable towns with rich detail.

Output JSON:
{
  "town": {
    "name": "Town Name",
    "description": "2-3 sentences: atmosphere, key feature, what it's known for",
    "population": 500,
    "size": "hamlet|village|town|city|metropolis",
    "location": "desert|forest|wilderness|necropolis|arctic|plains|riverside|coastal|mountain|swamp|underground|floating|jungle",
    "ruler": "Name and title of current ruler/leadership",
    "political_system": "monarchy|democracy|oligarchy|theocracy|anarchy|military|tribal|merchant_guild|magocracy",
    "history": "2-3 sentences of town history and notable events"
  },
  "suggestedShops": [
    {"name": "Shop Name", "shop_type": "general|weapons|armor|magic|apothecary|black_market", "description": "1 sentence unique trait"}
  ]
}

Prioritize specific, sensory details. Ensure all town attributes are cohesive and support the town's character.`

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
- Named ruler/leadership with title
- Form of government
- 2-3 sentences of town history
- 3-6 shops with types and 1-sentence traits

Be atmospheric and specific. Ensure all elements feel cohesive.`
}
