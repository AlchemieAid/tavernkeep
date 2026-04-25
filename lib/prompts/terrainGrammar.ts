/**
 * Layer 0 — Map Grammar Extraction
 * Sends the map image to gpt-4o and asks it to describe the VISUAL LANGUAGE of the
 * map before any coordinate extraction is attempted. The grammar is then used by
 * all subsequent layers so each one knows what rivers/mountains/cities look like
 * on this specific map style.
 */

export interface MapGrammar {
  map_type: string
  visual_grammar: Record<string, string>
  dominant_palette: string[]
  scale_notes: string
  layers_skipped?: string[]
}

export const TERRAIN_GRAMMAR_SYSTEM_PROMPT = `You are a cartographic analyst. Your task is to identify the VISUAL LANGUAGE of a map image — not to identify specific features or coordinates, just to describe how different things are drawn on this map.

Study the image carefully and determine:
1. What style/type of map this is
2. How each geographic feature category is visually represented (color, texture, line style, symbol type)
3. The dominant color palette

This grammar will be used by a downstream system to correctly interpret features on the map. Be precise and specific — avoid vague descriptions like "blue for water". Say instead "flat medium blue with small wave patterns drawn along coastlines".

OUTPUT FORMAT — respond ONLY with this JSON object, no prose:
{
  "map_type": "fantasy_illustrated | topographic | hand_drawn_parchment | satellite | city_plan | dungeon | undercity | cyberpunk | isometric | nautical | astral | other",
  "visual_grammar": {
    "ocean": "description of how ocean/sea is drawn",
    "rivers": "description of how rivers are drawn",
    "lakes": "description of how lakes are drawn",
    "mountains": "description of how mountains/high terrain is drawn",
    "hills": "description of how hills/elevated terrain is drawn",
    "forest": "description of how forests/woodland is drawn",
    "plains": "description of how flat open terrain is drawn",
    "desert": "description of how desert/arid terrain is drawn",
    "coast": "description of how coastlines/shorelines are drawn",
    "cities": "description of how cities/large settlements are drawn",
    "towns": "description of how smaller towns/villages are drawn",
    "roads": "description of how roads/paths are drawn (or 'not visible' if absent)",
    "special": "any unusual or unique visual elements not covered above (or 'none')"
  },
  "dominant_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "scale_notes": "brief note on the apparent scale and what the map covers"
}`

export const TERRAIN_GRAMMAR_USER_PROMPT =
  'Analyze the visual language and cartographic conventions used in this map. Describe how each feature type is drawn — not where, just how.'
