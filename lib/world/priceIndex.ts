import type { ResourceScores } from './terrainScores'

export interface PriceIndex {
  weapons_armor:   number
  tools_materials: number
  food_drink:      number
  herbs_potions:   number
  trade_goods:     number
  luxury_items:    number
  magical_items:   number
}

export type PriceDirection = 'cheaper' | 'normal' | 'expensive'

export interface PriceModifier {
  category: keyof PriceIndex
  label: string
  modifier: number
  direction: PriceDirection
  reason: string
}

export function computePriceIndex(scores: ResourceScores): PriceIndex {
  const {
    agriculture, fishing, forestry, mining,
    trade_access, water_access, wealth,
  } = scores

  return {
    weapons_armor:   clamp(1.0 - mining      * 0.6  + (1 - trade_access) * 0.2),
    tools_materials: clamp(1.0 - mining      * 0.5  + (1 - trade_access) * 0.1),
    food_drink:      clamp(1.0 - agriculture * 0.5  - fishing * 0.1 + (1 - water_access) * 0.1),
    herbs_potions:   clamp(1.0 - forestry    * 0.4  + (1 - trade_access) * 0.3),
    trade_goods:     clamp(1.0 - trade_access* 0.5),
    luxury_items:    clamp(1.0 - wealth      * 0.4  + (1 - trade_access) * 0.2),
    magical_items:   clamp(1.0 - wealth      * 0.3  + (1 - trade_access) * 0.4),
  }
}

function clamp(v: number): number {
  return Math.round(Math.max(0.3, Math.min(2.5, v)) * 100) / 100
}

export function priceModifiers(index: PriceIndex): PriceModifier[] {
  const entries: Array<{ category: keyof PriceIndex; label: string }> = [
    { category: 'weapons_armor',   label: 'Weapons & armor'  },
    { category: 'tools_materials', label: 'Tools & materials'},
    { category: 'food_drink',      label: 'Food & drink'     },
    { category: 'herbs_potions',   label: 'Herbs & potions'  },
    { category: 'trade_goods',     label: 'Trade goods'      },
    { category: 'luxury_items',    label: 'Luxury items'     },
    { category: 'magical_items',   label: 'Magical items'    },
  ]

  return entries.map(({ category, label }) => {
    const modifier = index[category]
    let direction: PriceDirection
    let reason: string
    if (modifier < 0.85) {
      direction = 'cheaper'
      reason = modifierReason(category, 'cheap')
    } else if (modifier > 1.15) {
      direction = 'expensive'
      reason = modifierReason(category, 'expensive')
    } else {
      direction = 'normal'
      reason = 'Average local supply'
    }
    return { category, label, modifier, direction, reason }
  })
}

function modifierReason(category: keyof PriceIndex, dir: 'cheap' | 'expensive'): string {
  const reasons: Record<keyof PriceIndex, { cheap: string; expensive: string }> = {
    weapons_armor:   { cheap: 'Iron-rich mining region', expensive: 'Few local ore deposits' },
    tools_materials: { cheap: 'Abundant stone and metal', expensive: 'Scarce raw materials' },
    food_drink:      { cheap: 'Fertile farmland and fisheries', expensive: 'Poor growing conditions' },
    herbs_potions:   { cheap: 'Dense forest and herb growth', expensive: 'Few herbalists nearby' },
    trade_goods:     { cheap: 'Major trade hub', expensive: 'Poor trade connections' },
    luxury_items:    { cheap: 'Wealthy merchant class', expensive: 'Low wealth, few luxuries' },
    magical_items:   { cheap: 'Arcane presence nearby', expensive: 'Isolated from magic' },
  }
  return reasons[category][dir]
}
