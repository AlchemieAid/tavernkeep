/**
 * Version Timestamp Lock Test
 * 
 * @fileoverview
 * Regression test for version timestamp bug where getVersionInfo() 
 * returned current time instead of build time.
 * 
 * The fix ensures BUILD_TIME_ISO is captured at module load time
 * (build time in production, dev server start in development).
 */

import { getVersionInfo } from '@/lib/version'

describe('getVersionInfo', () => {
  it('should return consistent timestamp across multiple calls', () => {
    const call1 = getVersionInfo()
    
    // Wait a small amount of time
    const start = Date.now()
    while (Date.now() - start < 10) {
      // Busy wait for 10ms
    }
    
    const call2 = getVersionInfo()
    
    // Both calls should return the same timestamp
    expect(call1.lastUpdated).toBe(call2.lastUpdated)
    expect(call1.version).toBe(call2.version)
    expect(call1.deploymentId).toBe(call2.deploymentId)
  })

  it('should return valid version format', () => {
    const info = getVersionInfo()
    
    // Version should follow pattern v0.0.{commit} or v0.0.dev
    expect(info.version).toMatch(/^v0\.0\.[a-f0-9]{7}$|^v0\.0\.dev$/)
  })

  it('should return valid timestamp format', () => {
    const info = getVersionInfo()
    
    // Should be a valid date string in Eastern Time format
    expect(info.lastUpdated).toBeTruthy()
    expect(typeof info.lastUpdated).toBe('string')
    
    // Should contain expected date components
    expect(info.lastUpdated).toMatch(/\d{1,2}/) // Day number
    expect(info.lastUpdated).toMatch(/\d{4}/) // Year
  })

  it('should include deploymentId field', () => {
    const info = getVersionInfo()
    
    expect(info).toHaveProperty('deploymentId')
    // In CI/test environment, this will be null
    // In Vercel production, it will be a string
    expect(typeof info.deploymentId === 'string' || info.deploymentId === null).toBe(true)
  })

  it('should not change timestamp between rapid successive calls', async () => {
    const timestamps: string[] = []
    
    // Make 10 rapid calls
    for (let i = 0; i < 10; i++) {
      timestamps.push(getVersionInfo().lastUpdated)
    }
    
    // All timestamps should be identical
    const uniqueTimestamps = new Set(timestamps)
    expect(uniqueTimestamps.size).toBe(1)
  })
})
