import versionData from './version.json'

export function getVersionInfo(): { version: string; lastUpdated: string } {
  return {
    version: versionData.version,
    lastUpdated: versionData.lastUpdated,
  }
}
