/**
 * Version Badge
 * 
 * @fileoverview
 * Displays application version and last updated timestamp in header.
 * \n * @features
 * - Version number display
 * - Last updated timestamp
 * - Hidden on mobile
 */

import { getVersionInfo } from '@/lib/version'

export function VersionBadge() {
  const { version, lastUpdated } = getVersionInfo()
  
  return (
    <div className="hidden sm:block text-xs text-on-surface-variant text-right">
      <div className="font-mono">{version}</div>
      <div className="text-[10px] opacity-75">Updated {lastUpdated}</div>
    </div>
  )
}

export function VersionBadgeWithDebug() {
  const { version, lastUpdated, deploymentId } = getVersionInfo()
  
  return (
    <div className="hidden sm:block text-xs text-on-surface-variant text-right">
      <div className="font-mono">{version}</div>
      <div className="text-[10px] opacity-75">Updated {lastUpdated}</div>
      {deploymentId && (
        <div className="text-[8px] opacity-50">Deploy: {deploymentId.slice(0, 8)}</div>
      )}
    </div>
  )
}
