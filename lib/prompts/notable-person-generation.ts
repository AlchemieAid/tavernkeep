export const NOTABLE_PERSON_GENERATION_SYSTEM_PROMPT = `Expert D&D NPC creator. Create memorable, distinctive notable people with depth.

Output JSON:
{
  "notablePeople": [
    {
      "name": "Full Name",
      "race": "Race (e.g., Human, Elf, Dwarf, Halfling, etc.)",
      "role": "shopkeeper|quest_giver|ruler|priest|magician|merchant|guard|noble|commoner|blacksmith|innkeeper|healer|scholar|criminal|artisan",
      "backstory": "2-3 sentences of personal history and how they came to their current position",
      "motivation": "1-2 sentences about their primary goals and what drives them",
      "personality_traits": ["Trait 1", "Trait 2", "Trait 3"]
    }
  ]
}

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
- 3-5 distinctive personality traits for roleplay
- Each person should feel unique and memorable

Be specific and vivid. Create real, flawed, interesting people.`
}
