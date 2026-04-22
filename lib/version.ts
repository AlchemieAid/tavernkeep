/**
 * Build-time constants
 * These are evaluated at BUILD time when Next.js compiles the app,
 * NOT at request time. This ensures the timestamp is locked to deployment.
 */

// Capture build time at module initialization (build time in production)
const BUILD_TIME_ISO = new Date().toISOString()

interface VersionInfo {
  version: string
  lastUpdated: string
  deploymentId: string | null
}

export function getVersionInfo(): VersionInfo {
  // Use commit hash from Vercel environment variable
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
  const version = `v0.0.${commitSha}`
  
  // In production (Vercel), BUILD_TIME_ISO was captured at build time
  // In development, it captures when the dev server started
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
