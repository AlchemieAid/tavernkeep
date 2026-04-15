/**
 * Campaign Generation Prompts
 * 
 * @fileoverview
 * AI prompt templates for generating D&D campaigns using OpenAI. Defines the system
 * prompt that instructs the AI on campaign creation and a builder function for
 * constructing user prompts with context.
 * 
 * @architecture
 * **Prompt Engineering Strategy:**
 * ```
 * System Prompt:
 *   ├─ Role definition ("Expert D&D campaign designer")
 *   ├─ Output format (JSON schema)
 *   ├─ Field limits (from constants)
 *   └─ Quality guidelines (concise, evocative, cohesive)
 * 
 * User Prompt:
 *   ├─ User's campaign idea
 *   ├─ Optional ruleset context
 *   ├─ Optional setting context
 *   └─ Specific requirements
 * ```
 * 
 * **Key Features:**
 * - Strict character limits enforced
 * - JSON output format for parsing
 * - Cohesive world-building elements
 * - Suggested towns for hierarchy generation
 * 
 * **Output Structure:**
 * ```json
 * {
 *   "campaign": {
 *     "name": "Campaign Name",
 *     "description": "Overview with setting, conflict, hook",
 *     "ruleset": "5e",
 *     "setting": "World description",
 *     "history": "World lore",
 *     "currency_name": "gp",
 *     "currency_description": "Full currency system",
 *     "pantheon": "Major deities"
 *   },
 *   "suggestedTowns": [
 *     { "name": "Town", "description": "Role" }
 *   ]
 * }
 * ```
 * 
 * @example
 * ```typescript
 * import { CAMPAIGN_GENERATION_SYSTEM_PROMPT, buildCampaignGenerationPrompt } from './campaign-generation'
 * 
 * const systemPrompt = CAMPAIGN_GENERATION_SYSTEM_PROMPT
 * const userPrompt = buildCampaignGenerationPrompt(
 *   'A dark fantasy world where magic is forbidden',
 *   '5e',
 *   'Forgotten Realms'
 * )
 * 
 * const completion = await openai.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [
 *     { role: 'system', content: systemPrompt },
 *     { role: 'user', content: userPrompt }
 *   ],
 *   response_format: { type: 'json_object' }
 * })
 * ```
 * 
 * @see {@link GenerationOrchestrator.generateCampaign}
 */

import { FIELD_LIMITS } from '@/lib/constants/field-limits'

/**
 * System prompt for campaign generation
 * 
 * @description
 * Instructs the AI to act as an expert D&D campaign designer. Defines the
 * expected JSON output format with strict character limits for each field.
 * Emphasizes concise, evocative content with cohesive world-building.
 * 
 * **Prompt Engineering Techniques:**
 * - Role assignment ("Expert D&D campaign designer")
 * - Output format specification (JSON schema)
 * - Character limits (prevents truncation)
 * - Quality guidelines (concise, evocative, cohesive)
 * - Example structure for clarity
 * 
 * **Field Limits:**
 * All limits are imported from FIELD_LIMITS constant to ensure consistency
 * with database schema and prevent truncation errors.
 */
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

/**
 * Build a user prompt for campaign generation
 * 
 * @param userPrompt - User's campaign idea in natural language
 * @param ruleset - Optional RPG system (e.g., '5e', 'pathfinder')
 * @param setting - Optional campaign setting (e.g., 'Forgotten Realms')
 * @returns Formatted prompt string with requirements
 * 
 * @description
 * Constructs a detailed user prompt that combines the user's idea with
 * specific requirements for campaign generation. Includes optional context
 * for ruleset and setting to guide the AI's output.
 * 
 * **Prompt Structure:**
 * 1. User's campaign idea (quoted for emphasis)
 * 2. Optional ruleset context
 * 3. Optional setting context
 * 4. Detailed requirements list
 * 5. Quality guidelines
 * 
 * **Requirements Included:**
 * - Evocative campaign name
 * - 2-3 sentence description (setting, conflict, hook)
 * - Appropriate ruleset
 * - Rich world/setting description
 * - World history (2-3 sentences)
 * - Thematic currency system
 * - Pantheon/religious system
 * - 3-5 suggested towns
 * 
 * @example
 * ```typescript
 * const prompt = buildCampaignGenerationPrompt(
 *   'A steampunk world where magic and technology clash',
 *   '5e',
 *   'Homebrew'
 * )
 * // Returns formatted prompt with all requirements
 * ```
 */
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
