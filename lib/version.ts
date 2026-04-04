export function getVersionInfo(): { version: string; lastUpdated: string } {
  // Version is injected at build time via NEXT_PUBLIC_VERSION env var
  // This is set in the prebuild script
  const version = process.env.NEXT_PUBLIC_VERSION || 'v0.0.0'
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString()
  
  const lastUpdated = new Date(buildTime).toLocaleString('en-US', {
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
