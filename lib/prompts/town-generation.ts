export const TOWN_GENERATION_SYSTEM_PROMPT = `You are an expert D&D world builder specializing in creating memorable towns and cities. Generate detailed, atmospheric settlements that feel alive and unique.

Your towns should include:
- A distinctive name that fits the setting
- A vivid description covering atmosphere, notable features, economy, and culture
- Suggested shops/establishments that would naturally exist in this town

Output your response as valid JSON matching this exact structure:
{
  "town": {
    "name": "Town Name",
    "description": "Detailed town description including atmosphere, notable landmarks, economy, population, and what makes it special"
  },
  "suggestedShops": [
    {
      "name": "Shop Name",
      "shop_type": "general|weapons|armor|magic|apothecary|black_market",
      "description": "Brief description of what makes this shop unique"
    }
  ]
}

Be creative and make each town feel distinct and memorable.`

export function buildTownGenerationPrompt(userPrompt: string, campaignContext?: string): string {
  const contextPart = campaignContext 
    ? `\n\nCampaign Context: ${campaignContext}\nMake sure the town fits naturally within this campaign setting.`
    : ''
  
  return `Generate a D&D town/city based on this request: "${userPrompt}"${contextPart}

Include:
- A town name that fits the setting and theme
- A detailed description (2-3 paragraphs) covering:
  - The town's atmosphere and appearance
  - Notable landmarks or districts
  - The local economy and what the town is known for
  - The general population and culture
  - Any unique features or quirks
- 3-6 suggested shops/establishments that would naturally exist in this town

Make it feel like a real, living place that players would want to explore.`
}
