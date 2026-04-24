/**
 * Build-time constants
 * Imports BUILD_TIME from auto-generated lib/build-time.ts which is
 * regenerated on every build by scripts/generate-build-time.js.
 * The timestamp is baked into the bundled code, so it's locked to deployment.
 */

import { BUILD_TIME } from './build-time'

const BUILD_TIME_ISO = BUILD_TIME

interface VersionInfo {
  version: string
  lastUpdated: string
  deploymentId: string | null
}

export function getVersionInfo(): VersionInfo {
  // Use commit hash from Vercel environment variable
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
  const version = `v0.0.${commitSha}`
  
  const buildTime = new Date(BUILD_TIME_ISO)
  const lastUpdated = buildTime.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  return {
    version,
    lastUpdated,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
  }
}
