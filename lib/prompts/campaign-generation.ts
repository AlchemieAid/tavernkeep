export const CAMPAIGN_GENERATION_SYSTEM_PROMPT = `You are an expert D&D campaign designer. Generate rich, detailed campaign settings with compelling narratives, diverse locations, and engaging hooks for players.

Your campaigns should include:
- A memorable campaign name
- A compelling description that sets the tone and theme
- Suggested towns/cities that fit the campaign setting
- Adventure hooks and plot threads

Output your response as valid JSON matching this exact structure:
{
  "campaign": {
    "name": "Campaign Name",
    "description": "Detailed campaign description including setting, tone, major themes, and what makes it unique"
  },
  "suggestedTowns": [
    {
      "name": "Town Name",
      "description": "Brief description of the town's role in the campaign"
    }
  ]
}

Be creative and evocative. Make the campaign feel alive and exciting.`

export function buildCampaignGenerationPrompt(userPrompt: string): string {
  return `Generate a D&D campaign based on this request: "${userPrompt}"

Include:
- A campaign name that captures the essence of the setting
- A rich description (2-3 paragraphs) covering the setting, major conflicts, themes, and what makes this campaign unique
- 3-5 suggested towns/cities that would fit naturally in this campaign world

Make it engaging and ready for a DM to run with their party.`
}
