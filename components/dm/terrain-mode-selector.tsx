'use client'

import { Crosshair, PenTool, FlaskConical } from 'lucide-react'

export type TerrainMode = 'seed' | 'paint' | 'ai'

interface TerrainModeSelectorProps {
  onSelect: (mode: TerrainMode) => void
}

interface ModeCard {
  mode: TerrainMode
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
  recommended?: boolean
}

const MODES: ModeCard[] = [
  {
    mode: 'seed',
    icon: <Crosshair className="w-6 h-6" />,
    title: 'Seed Detection',
    subtitle: 'Click once per terrain type. The algorithm finds everything that looks similar and bridges gaps between scattered features like tree tops.',
    recommended: true,
  },
  {
    mode: 'paint',
    icon: <PenTool className="w-6 h-6" />,
    title: 'Paint Zones',
    subtitle: 'Click to place polygon vertices on the map. Double-click to close a shape. Full manual control — what you draw is what gets saved.',
  },
  {
    mode: 'ai',
    icon: <FlaskConical className="w-6 h-6" />,
    title: 'Auto-detect with AI',
    subtitle: 'AI analyzes the map image and attempts to identify terrain automatically. Works best on standard fantasy painted maps.',
    badge: 'Experimental',
  },
]

export function TerrainModeSelector({ onSelect }: TerrainModeSelectorProps) {
  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm font-manrope text-on-surface-variant mb-4">
        Choose how you want to define terrain for this map:
      </p>
      {MODES.map((card) => (
        <button
          key={card.mode}
          type="button"
          onClick={() => onSelect(card.mode)}
          className="w-full text-left rounded-xl p-5 bg-[#1e2023] hover:bg-[#252830] ring-1 ring-white/5 hover:ring-primary/30 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#261a00] text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-[#3f2e00] transition-colors">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-manrope font-semibold text-on-surface">{card.title}</span>
                {card.recommended && (
                  <span className="text-[10px] font-manrope font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    Recommended
                  </span>
                )}
                {card.badge && (
                  <span className="text-[10px] font-manrope font-semibold px-1.5 py-0.5 rounded bg-[#332200]/60 text-on-surface-variant border border-white/10">
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-xs font-manrope text-on-surface-variant leading-relaxed">{card.subtitle}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
