/**
 * Version Timestamp Lock Test
 *
 * @fileoverview
 * Regression tests ensuring the deployment timestamp is locked to build time,
 * not to the current time at request/call time.
 *
 * Architecture:
 *   - scripts/generate-build-time.js writes lib/build-time.ts at build time
 *   - lib/version.ts imports BUILD_TIME from lib/build-time.ts
 *   - The value is a static string baked into the bundle, not new Date()
 */

import { getVersionInfo } from '@/lib/version'
import { BUILD_TIME } from '@/lib/build-time'
import * as fs from 'fs'
import * as path from 'path'

describe('Build-time timestamp infrastructure', () => {
  it('lib/build-time.ts must exist and export a valid ISO timestamp', () => {
    const buildTimePath = path.join(process.cwd(), 'lib', 'build-time.ts')
    expect(fs.existsSync(buildTimePath)).toBe(true)

    const content = fs.readFileSync(buildTimePath, 'utf-8')
    const isoMatch = content.match(/'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)'/)
    expect(isoMatch).not.toBeNull()
  })

  it('BUILD_TIME export must be a valid ISO 8601 date string', () => {
    expect(typeof BUILD_TIME).toBe('string')
    const parsed = new Date(BUILD_TIME)
    expect(Number.isNaN(parsed.getTime())).toBe(false)
    // ISO format: YYYY-MM-DDTHH:MM:SS.mmmZ
    expect(BUILD_TIME).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/)
  })

  it('BUILD_TIME must not be the epoch stub (1970-01-01) — build script must have run', () => {
    expect(BUILD_TIME).not.toBe('1970-01-01T00:00:00.000Z')
    const year = new Date(BUILD_TIME).getFullYear()
    expect(year).toBeGreaterThanOrEqual(2025)
  })

  it('generate-build-time.js script must exist', () => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate-build-time.js')
    expect(fs.existsSync(scriptPath)).toBe(true)
  })

  it('package.json prebuild must invoke generate-build-time.js', () => {
    const pkgPath = path.join(process.cwd(), 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    expect(pkg.scripts?.prebuild).toContain('generate-build-time.js')
  })
})

describe('getVersionInfo', () => {
  it('lastUpdated must derive from BUILD_TIME, not new Date()', () => {
    const beforeCall = Date.now()
    const info = getVersionInfo()
    const afterCall = Date.now()

    // Parse the displayed timestamp back to a UTC ms value
    const displayedMs = new Date(BUILD_TIME).getTime()

    // The displayed time should match BUILD_TIME, not the time of the call
    // If it were new Date(), it would be between beforeCall and afterCall
    // Instead it should be exactly BUILD_TIME
    expect(displayedMs).not.toBeGreaterThanOrEqual(beforeCall)
    // (This would fail if the build ran less than 1ms ago — practically impossible in a test suite)

    // More direct: re-construct what lastUpdated should look like from BUILD_TIME
    const expected = new Date(BUILD_TIME).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    expect(info.lastUpdated).toBe(expected)
  })

  it('should return consistent timestamp across multiple calls', () => {
    const call1 = getVersionInfo()
    const start = Date.now()
    while (Date.now() - start < 10) { /* busy wait 10ms */ }
    const call2 = getVersionInfo()

    expect(call1.lastUpdated).toBe(call2.lastUpdated)
    expect(call1.version).toBe(call2.version)
  })

  it('should return valid version format', () => {
    const { version } = getVersionInfo()
    expect(version).toMatch(/^v0\.0\.[a-f0-9]{7}$|^v0\.0\.dev$/)
  })

  it('should return a non-empty lastUpdated string', () => {
    const { lastUpdated } = getVersionInfo()
    expect(typeof lastUpdated).toBe('string')
    expect(lastUpdated.length).toBeGreaterThan(0)
  })

  it('should include deploymentId field (null in CI, string on Vercel)', () => {
    const { deploymentId } = getVersionInfo()
    expect(typeof deploymentId === 'string' || deploymentId === null).toBe(true)
  })
})
