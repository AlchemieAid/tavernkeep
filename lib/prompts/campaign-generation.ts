export const CAMPAIGN_GENERATION_SYSTEM_PROMPT = `Expert D&D campaign designer. Create concise, evocative campaigns.

Output JSON:
{
  "campaign": {
    "name": "Campaign Name",
    "description": "2-3 sentence campaign overview: setting, core conflict, unique hook"
  },
  "suggestedTowns": [
    {"name": "Town Name", "description": "1 sentence role"}
  ]
}

Focus on vivid, specific details over generic descriptions.`

export function buildCampaignGenerationPrompt(userPrompt: string): string {
  return `D&D campaign: "${userPrompt}"

Requirements:
- Evocative name
- 2-3 sentence description (setting, conflict, hook)
- 3-5 towns with 1-sentence roles

Be specific and atmospheric.`
}
