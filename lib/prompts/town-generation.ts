export const TOWN_GENERATION_SYSTEM_PROMPT = `Expert D&D world builder. Create vivid, memorable towns.

Output JSON:
{
  "town": {
    "name": "Town Name",
    "description": "2-3 sentences: atmosphere, key feature, what it's known for"
  },
  "suggestedShops": [
    {"name": "Shop Name", "shop_type": "general|weapons|armor|magic|apothecary|black_market", "description": "1 sentence unique trait"}
  ]
}

Prioritize specific, sensory details.`

export function buildTownGenerationPrompt(userPrompt: string, campaignContext?: string): string {
  const contextPart = campaignContext ? `\nCampaign: ${campaignContext}` : ''
  
  return `D&D town: "${userPrompt}"${contextPart}

Requirements:
- Fitting name
- 2-3 sentence description (atmosphere, landmark, specialty)
- 3-6 shops with types and 1-sentence traits

Be atmospheric and specific.`
}
