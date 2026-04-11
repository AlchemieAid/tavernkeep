/**
 * Generation Module - Hierarchical AI Content Generation
 * 
 * Exports:
 * - GenerationOrchestrator: Main orchestration class
 * - ContextBuilder: Build cascading context for prompts
 * - Types: All generation-related types
 * 
 * Usage:
 * ```typescript
 * import { createOrchestrator } from '@/lib/generation'
 * 
 * const orchestrator = createOrchestrator(userId, dmId, {
 *   config: { campaign: { autoGenerateTowns: true } },
 *   onProgress: (event) => console.log(event)
 * })
 * 
 * const result = await orchestrator.generateCampaign(
 *   "A dark fantasy world where dragons rule"
 * )
 * ```
 */

export { GenerationOrchestrator, createOrchestrator } from './orchestrator'
export { ContextBuilder, createContextBuilder } from './context-builder'
export type {
  GenerationConfig,
  GenerationContext,
  GenerationProgress,
  GenerationEvent,
  GenerationOptions,
  GenerationStep,
} from './types'
export { DEFAULT_GENERATION_CONFIG } from './types'
