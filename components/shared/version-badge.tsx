import { getVersion } from '@/lib/version'

export function VersionBadge() {
  const version = getVersion()
  
  return (
    <div className="text-xs text-on-surface-variant font-mono">
      {version}
    </div>
  )
}
