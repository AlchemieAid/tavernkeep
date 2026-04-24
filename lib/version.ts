/**
 * Build-time constants
 * Uses Vercel's VERCEL_BUILD_TIME environment variable which is set at build time.
 * In production (Vercel), this is locked to the deployment time.
 * In development, shows when the dev server started.
 */

// In Vercel, VERCEL_BUILD_TIME is set at build time and doesn't change on server restart
// In development, use current time (when dev server started)
const BUILD_TIME_ISO = process.env.VERCEL_BUILD_TIME || new Date().toISOString()

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
