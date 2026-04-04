import { readFileSync } from 'fs'
import { join } from 'path'

export function getVersionInfo(): { version: string; lastUpdated: string } {
  try {
    const versionPath = join(process.cwd(), 'lib', 'version.json')
    const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'))
    return {
      version: versionData.version,
      lastUpdated: versionData.lastUpdated,
    }
  } catch (error) {
    // Fallback if file doesn't exist
    return {
      version: 'v0.0.0',
      lastUpdated: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    }
  }
}
