/**
 * Config Schemas Tests
 *
 * Validates the per-key Zod schemas that gate writes to `app_config`.
 */
import { describe, it, expect } from '@jest/globals'
import {
  validateConfigValue,
  getConfigWidgetKind,
  getConfigDefault,
  CONFIG_SCHEMAS,
} from '@/lib/admin/config-schemas'

describe('config-schemas', () => {
  describe('validateConfigValue', () => {
    it('accepts valid rate-limit shapes', () => {
      const result = validateConfigValue('rate_limit_campaign', {
        maxRequests: 10,
        windowMinutes: 60,
      })
      expect(result.success).toBe(true)
    })

    it('rejects rate-limit with string instead of number', () => {
      const result = validateConfigValue('rate_limit_campaign', {
        maxRequests: '10',
        windowMinutes: 60,
      })
      expect(result.success).toBe(false)
    })

    it('rejects rate-limit with missing field', () => {
      const result = validateConfigValue('rate_limit_campaign', {
        maxRequests: 10,
      })
      expect(result.success).toBe(false)
    })

    it('accepts boolean for feature flags', () => {
      const result = validateConfigValue('feature_admin_panel', false)
      expect(result.success).toBe(true)
    })

    it('rejects non-boolean for feature flags', () => {
      const result = validateConfigValue('feature_admin_panel', 'yes')
      expect(result.success).toBe(false)
    })

    it('clamps ai_temperature to 0–2', () => {
      expect(validateConfigValue('ai_temperature', 0.5).success).toBe(true)
      expect(validateConfigValue('ai_temperature', 2.5).success).toBe(false)
      expect(validateConfigValue('ai_temperature', -0.1).success).toBe(false)
    })

    it('accepts unknown keys (open extension)', () => {
      const result = validateConfigValue('newly_added_key', { anything: true })
      expect(result.success).toBe(true)
    })
  })

  describe('getConfigWidgetKind', () => {
    it('returns the curated kind for known keys', () => {
      expect(getConfigWidgetKind('feature_admin_panel')).toBe('boolean')
      expect(getConfigWidgetKind('ai_temperature')).toBe('number')
      expect(getConfigWidgetKind('ai_model_default')).toBe('string')
      expect(getConfigWidgetKind('rate_limit_campaign')).toBe('json')
    })

    it('falls back to json for unknown keys', () => {
      expect(getConfigWidgetKind('mystery_key')).toBe('json')
    })
  })

  describe('getConfigDefault', () => {
    it('returns the schema default for known keys', () => {
      expect(getConfigDefault('feature_ai_generation', null)).toBe(true)
      expect(getConfigDefault('ai_max_retries', 0)).toBe(3)
    })

    it('returns the supplied fallback for unknown keys', () => {
      expect(getConfigDefault('unknown_key', 'fallback-value')).toBe('fallback-value')
    })
  })

  describe('CONFIG_SCHEMAS coverage', () => {
    it('covers every category we expect to validate', () => {
      const keys = Object.keys(CONFIG_SCHEMAS)
      expect(keys).toEqual(expect.arrayContaining([
        'rate_limit_campaign',
        'feature_admin_panel',
        'ai_temperature',
        'system_maintenance_mode',
      ]))
    })
  })
})
