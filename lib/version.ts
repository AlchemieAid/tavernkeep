/**
 * Build-time constants
 * The timestamp is captured during the build process via build script
 * and written to .build-info.json. This ensures the timestamp is locked to deployment.
 */

import fs from 'fs'
import path from 'path'

// Read build timestamp from .build-info.json (generated during build)
let BUILD_TIME_ISO: string
try {
  const buildInfoPath = path.join(process.cwd(), '.build-info.json')
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'))
  BUILD_TIME_ISO = buildInfo.timestamp
} catch {
  // Fallback to current time if build info doesn't exist (development)
  BUILD_TIME_ISO = new Date().toISOString()
}

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
