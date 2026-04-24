import { z } from 'zod'

export const MapSizeSchema = z.enum(['region', 'kingdom', 'continent'])
export const MapStyleSchema = z.enum(['fantasy_painted', 'parchment', 'hand_drawn', 'topographic'])
export const BiomeProfileSchema = z.enum(['temperate', 'arctic', 'tropical', 'arid', 'archipelago', 'volcanic'])

export const GenerateMapsSchema = z.object({
  campaign_id: z.string().uuid(),
  map_size: MapSizeSchema,
  map_style: MapStyleSchema,
  biome_profile: BiomeProfileSchema,
  dm_description: z.string().max(500).optional(),
})

// Accepts both HTTP/HTTPS URLs and data URIs (base64 images from AI providers like Gemini)
const ImageUrlSchema = z.string().refine(
  (val) => val.startsWith('data:') || val.startsWith('http://') || val.startsWith('https://'),
  { message: 'Must be a valid URL or data URI' }
)

export const ClassifyTerrainSchema = z.object({
  map_id: z.string().uuid(),
  image_url: ImageUrlSchema,
})

export const PlaceResourcesSchema = z.object({
  map_id: z.string().uuid(),
  image_url: ImageUrlSchema.optional(), // accepted for backward compat but not used in AI call
})

export const PlaceTownSchema = z.object({
  map_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  x_pct: z.number().min(0).max(1),
  y_pct: z.number().min(0).max(1),
  name_override: z.string().max(80).optional(),
})

export const UploadMapSchema = z.object({
  campaign_id: z.string().uuid(),
  map_size: MapSizeSchema,
  map_style: MapStyleSchema.optional(),
  biome_profile: BiomeProfileSchema.optional(),
})

export const GenerateAtmosphereSchema = z.object({
  terrain_area_id: z.string().uuid(),
  map_id: z.string().uuid(),
})

export type GenerateMapsInput   = z.infer<typeof GenerateMapsSchema>
export type ClassifyTerrainInput = z.infer<typeof ClassifyTerrainSchema>
export type PlaceResourcesInput  = z.infer<typeof PlaceResourcesSchema>
export type PlaceTownInput       = z.infer<typeof PlaceTownSchema>
export type UploadMapInput       = z.infer<typeof UploadMapSchema>
export type GenerateAtmosphereInput = z.infer<typeof GenerateAtmosphereSchema>
