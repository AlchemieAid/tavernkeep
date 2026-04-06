import { FIELD_LIMITS } from '@/lib/constants/field-limits'

export const NOTABLE_PERSON_GENERATION_SYSTEM_PROMPT = `Expert D&D NPC creator. Create memorable, distinctive notable people with depth.

Output JSON:
{
  "notablePeople": [
    {
      "name": "Full Name (max ${FIELD_LIMITS.NOTABLE_PERSON_NAME} chars)",
      "race": "Race (e.g., Human, Elf, Dwarf, Halfling, etc.) (max ${FIELD_LIMITS.NOTABLE_PERSON_RACE} chars)",
      "role": "shopkeeper|quest_giver|ruler|priest|magician|merchant|guard|noble|commoner|blacksmith|innkeeper|healer|scholar|criminal|artisan",
      "backstory": "2-3 sentences of personal history and how they came to their current position (max ${FIELD_LIMITS.NOTABLE_PERSON_BACKSTORY} chars)",
      "motivation": "1-2 sentences about their primary goals and what drives them (max ${FIELD_LIMITS.NOTABLE_PERSON_MOTIVATION} chars)",
      "personality_traits": ["Single-word trait 1", "Single-word trait 2", "Single-word trait 3"]
    }
  ]
}

CRITICAL: Respect all character limits strictly. Keep content concise and impactful.
Create distinct, memorable personalities. Avoid generic NPCs. Each should feel like a real person with depth.`

export function buildNotablePersonGenerationPrompt(
  userPrompt: string,
  townContext?: string,
  campaignContext?: string,
  role?: string,
  count: number = 1
): string {
  const townPart = townContext ? `\nTown: ${townContext}` : ''
  const campaignPart = campaignContext ? `\nCampaign: ${campaignContext}` : ''
  const rolePart = role ? `\nRole: ${role}` : ''
  
  return `D&D notable person/people: "${userPrompt}"${townPart}${campaignPart}${rolePart}

Requirements:
- Generate ${count} notable ${count === 1 ? 'person' : 'people'}
- Full name (first and last, appropriate to race/culture)
- Specific race
- Clear role: ${role || 'any appropriate role'}
- 2-3 sentence backstory (personal history, how they got here)
- 1-2 sentence motivation (goals, drives)
- 3-5 distinctive single-word personality traits for roleplay (e.g., "Brave", "Cunning", "Greedy")
- Each person should feel unique and memorable

Be specific and vivid. Create real, flawed, interesting people.`
}
