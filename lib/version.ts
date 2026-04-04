export function getVersionInfo(): { version: string; lastUpdated: string } {
  // Use commit hash from Vercel environment variable
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
  const version = `v0.0.${commitSha}`
  
  // Get build time and format in Eastern Time
  const buildTime = new Date()
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
  }
}
