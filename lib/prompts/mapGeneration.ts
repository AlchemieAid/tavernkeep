export interface MapGenerationParams {
  map_size: 'region' | 'kingdom' | 'continent'
  map_style: string
  biome_profile: string
  dm_description?: string
}

const SIZE_SCALE: Record<string, string> = {
  region:    'roughly 200km² — a single river valley, mountain range, or coastal stretch',
  kingdom:   'roughly 2000km² — a full kingdom with multiple biomes and a major city',
  continent: 'roughly 20000km² — a continent-scale landmass with diverse climate zones',
}

export function buildMapGenerationPrompt(params: MapGenerationParams): string {
  const { map_size, map_style, biome_profile, dm_description } = params
  const scale = SIZE_SCALE[map_size] ?? SIZE_SCALE.region

  const styleGuide: Record<string, string> = {
    fantasy_painted:
      'rich oil-painting style fantasy cartography — vibrant colors, illustrated terrain features, dramatic lighting',
    parchment:
      'aged parchment-style map with sepia tones, hand-drawn coastlines, hatching for mountains, decorative compass rose',
    hand_drawn:
      'clean hand-drawn style with ink linework, minimal color washes, clear terrain labels, explorer aesthetic',
    topographic:
      'topographic map with elevation contour lines, realistic terrain shading, functional rather than decorative',
  }

  const biomeGuide: Record<string, string> = {
    temperate:
      'mix of deciduous forest, rolling plains, rivers, and gentle hills. Moderate climate.',
    arctic:
      'frozen tundra, glacial fjords, snow-capped mountain ranges, sparse frozen pine forests.',
    tropical:
      'dense jungle, wide slow rivers, coastal mangroves, volcanic peaks shrouded in cloud.',
    arid:
      'vast desert with sand dunes and rocky badlands, scattered oases, dry riverbeds, canyon systems.',
    archipelago:
      'island chains of varying size, shallow coastal waters, coral formations, volcanic islands.',
    volcanic:
      'dramatic volcanic landscape with lava flows, obsidian fields, caldera lakes, fumarole fields.',
  }

  const style = styleGuide[map_style] ?? styleGuide.fantasy_painted
  const biome = biomeGuide[biome_profile] ?? biomeGuide.temperate

  const customPart = dm_description
    ? `\n\nThe DM has provided these additional details: "${dm_description}"`
    : ''

  return [
    `Create a top-down fantasy map suitable for tabletop roleplaying.`,
    ``,
    `Scale: ${scale}.`,
    `Art style: ${style}.`,
    `Biome: ${biome}`,
    customPart,
    ``,
    `Requirements:`,
    `- Clear geographic features: rivers, coastlines, mountain ranges, forests, settlements`,
    `- No text labels or legends overlaid on the map`,
    `- High contrast between terrain types for easy classification`,
    `- Natural-looking terrain distribution (not symmetrical or repeating)`,
    `- Leave white/neutral margin of at most 2% around edges`,
  ]
    .join('\n')
    .trim()
}
