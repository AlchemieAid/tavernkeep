import { computePriceIndex, priceModifiers } from '@/lib/world/priceIndex'
import type { ResourceScores } from '@/lib/world/terrainScores'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface PriceIndexPanelProps {
  resourceScores: ResourceScores
  townName?: string | null
}

export function PriceIndexPanel({ resourceScores, townName }: PriceIndexPanelProps) {
  const index = computePriceIndex(resourceScores)
  const modifiers = priceModifiers(index)

  return (
    <div className="rounded-2xl border border-border bg-surface-container p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-on-surface text-sm">Local Economy</h3>
        {townName && (
          <p className="text-xs text-on-surface-variant mt-0.5">Derived from the resource environment around {townName}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {modifiers.map(mod => (
          <div key={mod.category} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {mod.direction === 'cheaper' && <TrendingDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              {mod.direction === 'expensive' && <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              {mod.direction === 'normal' && <Minus className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />}
              <span className="text-xs text-on-surface truncate">{mod.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-on-surface-variant text-right max-w-[140px] truncate">{mod.reason}</span>
              <span className={`text-xs font-semibold tabular-nums w-10 text-right ${
                mod.direction === 'cheaper' ? 'text-emerald-500'
                : mod.direction === 'expensive' ? 'text-rose-500'
                : 'text-on-surface-variant'
              }`}>
                {mod.direction === 'cheaper' ? '↓' : mod.direction === 'expensive' ? '↑' : '='} {Math.round(mod.modifier * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-on-surface-variant border-t border-border pt-3">
        Price modifiers reflect local supply and demand. 100% = market rate.
      </p>
    </div>
  )
}
