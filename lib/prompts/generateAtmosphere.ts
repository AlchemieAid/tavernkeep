export const ATMOSPHERE_SYSTEM_PROMPT = `You write 2–3 sentence atmosphere descriptions for D&D terrain areas. These are read aloud to players to set a scene.

Rules:
- Second person, present tense ("The air is...", "You smell...", "Ahead...")
- Sensory and specific — engage smell, sound, and texture, not just sight
- No generic fantasy clichés. No "ancient and mysterious" or "mystical aura".
- Ground the description in the real ecology: name specific plants, sounds, and weather phenomena
- For hazard-prone areas, hint at danger without stating it directly
- Length: exactly 2–3 sentences. No more.`

export interface AtmosphereInput {
  terrain_type: string
  elevation_m: number
  climate_zone: string
  temp_summer_high_c: number
  temp_winter_low_c: number
  annual_rainfall_mm: number
  top_3_flora: string[]
  top_3_fauna: string[]
  hazards: string[]
}

export function buildAtmospherePrompt(input: AtmosphereInput): string {
  const {
    terrain_type, elevation_m, climate_zone,
    temp_summer_high_c, temp_winter_low_c, annual_rainfall_mm,
    top_3_flora, top_3_fauna, hazards,
  } = input

  return [
    `Write atmosphere text for this terrain area.`,
    ``,
    `Terrain: ${terrain_type}`,
    `Elevation: ~${Math.round(elevation_m)}m`,
    `Climate: ${climate_zone} (${temp_summer_high_c}°C summer / ${temp_winter_low_c}°C winter, ${annual_rainfall_mm}mm/yr)`,
    `Flora: ${top_3_flora.join(', ')}`,
    `Fauna: ${top_3_fauna.join(', ')}`,
    hazards.length > 0 ? `Hazards: ${hazards.join(', ')}` : '',
    ``,
    `Write 2–3 sentences of atmosphere text. Second person, present tense. No clichés.`,
  ]
    .filter(line => line !== undefined)
    .join('\n')
    .trim()
}
