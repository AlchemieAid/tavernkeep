export const CAMPAIGN_GENERATION_SYSTEM_PROMPT = `Expert D&D campaign designer. Create concise, evocative campaigns with rich world-building.

Output JSON:
{
  "campaign": {
    "name": "Campaign Name",
    "description": "2-3 sentence campaign overview: setting, core conflict, unique hook",
    "ruleset": "5e",
    "setting": "World/setting name and brief description",
    "history": "2-3 sentences of world history and lore",
    "currency_name": "Short currency name (e.g., 'gp', 'sc', 'drakes')",
    "currency_description": "Full currency system description (e.g., 'Gold Pieces (gp), Silver Crowns (sc), Copper Bits (cb)')",
    "pantheon": "Brief description of major deities or religious system"
  },
  "suggestedTowns": [
    {"name": "Town Name", "description": "1 sentence role"}
  ]
}

Focus on vivid, specific details over generic descriptions. Ensure all world-building elements are cohesive.`

export function buildCampaignGenerationPrompt(userPrompt: string, ruleset?: string, setting?: string): string {
  const rulesetContext = ruleset ? `\nRuleset: ${ruleset}` : ''
  const settingContext = setting ? `\nSetting: ${setting}` : ''
  
  return `D&D campaign: "${userPrompt}"${rulesetContext}${settingContext}

Requirements:
- Evocative name
- 2-3 sentence description (setting, conflict, hook)
- Appropriate ruleset (default to ${ruleset || '5e'} if not specified)
- Rich setting/world name and description
- 2-3 sentences of world history
- Thematic currency system with short name (e.g., 'gp') and full description
- Brief pantheon/religious system (2-3 major deities)
- 3-5 towns with 1-sentence roles

Be specific and atmospheric. Ensure all elements feel cohesive and support the campaign theme.`
}
