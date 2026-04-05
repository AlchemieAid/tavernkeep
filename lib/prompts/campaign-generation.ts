import { FIELD_LIMITS } from '@/lib/constants/field-limits'

export const CAMPAIGN_GENERATION_SYSTEM_PROMPT = `Expert D&D campaign designer. Create concise, evocative campaigns with rich world-building.

Output JSON:
{
  "campaign": {
    "name": "Campaign Name (max ${FIELD_LIMITS.CAMPAIGN_NAME} chars)",
    "description": "2-3 sentence campaign overview: setting, core conflict, unique hook (max ${FIELD_LIMITS.CAMPAIGN_DESCRIPTION} chars)",
    "ruleset": "5e (max ${FIELD_LIMITS.CAMPAIGN_RULESET} chars)",
    "setting": "World/setting name and brief description (max ${FIELD_LIMITS.CAMPAIGN_SETTING} chars)",
    "history": "2-3 sentences of world history and lore (max ${FIELD_LIMITS.CAMPAIGN_HISTORY} chars)",
    "currency_name": "Short currency name (e.g., 'gp', 'sc', 'drakes') (max ${FIELD_LIMITS.CAMPAIGN_CURRENCY_NAME} chars)",
    "currency_description": "Full currency system description (e.g., 'Gold Pieces (gp), Silver Crowns (sc), Copper Bits (cb)') (max ${FIELD_LIMITS.CAMPAIGN_CURRENCY_DESCRIPTION} chars)",
    "pantheon": "Brief description of major deities or religious system (max ${FIELD_LIMITS.CAMPAIGN_PANTHEON} chars)"
  },
  "suggestedTowns": [
    {"name": "Town Name (max ${FIELD_LIMITS.TOWN_NAME} chars)", "description": "1 sentence role (max ${FIELD_LIMITS.TOWN_DESCRIPTION} chars)"}
  ]
}

CRITICAL: Respect all character limits strictly. Keep content concise and impactful.
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
