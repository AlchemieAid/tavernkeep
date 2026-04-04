import { getVersionInfo } from '@/lib/version'

export function VersionBadge() {
  const { version, lastUpdated } = getVersionInfo()
  
  return (
    <div className="text-xs text-on-surface-variant text-right">
      <div className="font-mono">{version}</div>
      <div className="text-[10px] opacity-75">Updated {lastUpdated}</div>
    </div>
  )
}
