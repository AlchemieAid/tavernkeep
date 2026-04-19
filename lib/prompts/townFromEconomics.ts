export const TOWN_FROM_ECONOMICS_SYSTEM_PROMPT = `You are a world-building assistant generating a settlement description for a D&D campaign. You will receive computed economic and geographic data for a map location. Your job is to write flavourful, specific prose that feels like a real place — not a generic fantasy town.

OUTPUT FORMAT — respond ONLY with valid JSON:
{
  "name": "string — a short, memorable settlement name fitting the terrain and culture",
  "description": "string — 3–5 sentences. Second person, present tense. Describe what a traveler sees, smells, and hears on arrival. Be specific to the terrain, resources, and hazards.",
  "history": "string — 2–3 sentences of founding or significant history that explains WHY this place exists here.",
  "notable_character": "string — One sentence describing a notable local figure (not the ruler). Specific and evocative.",
  "local_tension": "string — One sentence describing a current problem, rumor, or source of conflict."
}

Rules:
- Use the price context and specializations to color the description (an iron-rich mining town should feel gritty and loud; a river trade hub should feel busy and cosmopolitan)
- Hazards inject into architecture and culture: avalanche towns have stone buildings and avalanche walls; flood plains have elevated granaries and stilted construction
- Do not use tired fantasy clichés: no "bustling market squares" or "townsfolk going about their daily business"
- Keep name short (1–3 words). Avoid apostrophes in proper nouns.
- All prose in second-person present tense: "You arrive at...", "The smell of...", "Above the rooftops..."`

export function buildTownFromEconomicsPrompt(economicContext: string): string {
  return `Generate a settlement for this location based on its computed economic and geographic profile.\n\n${economicContext}\n\nRespond only with the JSON object.`
}
