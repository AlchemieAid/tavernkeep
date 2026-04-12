import type { ReactNode } from 'react'

interface ItemStatsDisplayProps {
  category: string
  properties: Record<string, unknown> | null
}

function s(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}

function n(val: unknown): number | null {
  const parsed = Number(val)
  return isNaN(parsed) ? null : parsed
}

function StatRow({ label, value }: { label: string; value: string }): ReactNode {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-on-surface-variant shrink-0">{label}</span>
      <span className="text-on-surface font-medium text-right">{value}</span>
    </div>
  )
}

function Badge({ children }: { children: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-variant text-on-surface-variant border border-outline-variant capitalize">
      {children}
    </span>
  )
}

export function ItemStatsDisplay({ category, properties }: ItemStatsDisplayProps) {
  if (!properties || typeof properties !== 'object') return null
  const p = properties

  if (category === 'weapon') {
    const props = Array.isArray(p.properties) ? (p.properties as string[]) : []
    return (
      <div className="space-y-1 pt-1 border-t border-outline-variant">
        {p.damage_dice && p.damage_type ? (
          <StatRow label="Damage" value={`${s(p.damage_dice)} ${s(p.damage_type)}`} />
        ) : null}
        {p.versatile_damage ? (
          <StatRow label="Versatile" value={s(p.versatile_damage)} />
        ) : null}
        {(p.range_short || p.range_long) ? (
          <StatRow label="Range" value={`${s(p.range_short)}/${s(p.range_long)} ft`} />
        ) : null}
        {p.weapon_category && p.weapon_type ? (
          <StatRow label="Type" value={`${s(p.weapon_category)} ${s(p.weapon_type)}`} />
        ) : null}
        {props.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {props.map((prop) => <Badge key={prop}>{prop}</Badge>)}
          </div>
        )}
      </div>
    )
  }

  if (category === 'armor') {
    const ac = n(p.armor_class)
    const maxDex = p.max_dex_bonus === null ? null : n(p.max_dex_bonus)
    const strReq = n(p.str_requirement)
    let acDisplay = ''
    if (ac !== null) {
      if (p.ac_type === 'bonus') acDisplay = `+${ac}`
      else if (maxDex === null) acDisplay = `${ac} + DEX`
      else if (maxDex === 0) acDisplay = String(ac)
      else acDisplay = `${ac} + DEX (max ${maxDex})`
    }
    return (
      <div className="space-y-1 pt-1 border-t border-outline-variant">
        <StatRow label="AC" value={acDisplay} />
        <StatRow label="Category" value={s(p.armor_category)} />
        {strReq !== null && strReq > 0 && <StatRow label="STR req." value={s(strReq)} />}
        {p.stealth_disadvantage === true && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            <Badge>stealth disadvantage</Badge>
          </div>
        )}
      </div>
    )
  }

  if (category === 'potion') {
    const healDice = s(p.healing_dice)
    const healBonus = n(p.healing_bonus)
    const healStr = healDice ? `${healDice}${healBonus ? `+${healBonus}` : ''} HP` : ''
    return (
      <div className="space-y-1 pt-1 border-t border-outline-variant">
        {healStr ? <StatRow label="Healing" value={healStr} /> : null}
        {p.temp_hp ? <StatRow label="Temp HP" value={`+${s(p.temp_hp)}`} /> : null}
        {p.effect ? <StatRow label="Effect" value={s(p.effect)} /> : null}
        {p.duration ? <StatRow label="Duration" value={s(p.duration)} /> : null}
      </div>
    )
  }

  if (category === 'scroll') {
    const lvl = n(p.spell_level)
    const suffixes = ['st', 'nd', 'rd']
    const lvlStr = lvl === 0 ? 'Cantrip' : lvl !== null ? `${lvl}${suffixes[lvl - 1] ?? 'th'}-level` : ''
    return (
      <div className="space-y-1 pt-1 border-t border-outline-variant">
        <StatRow label="Level" value={lvlStr} />
        {p.save_dc ? <StatRow label="Save DC" value={s(p.save_dc)} /> : null}
        {p.attack_bonus ? <StatRow label="Attack" value={`+${s(p.attack_bonus)}`} /> : null}
      </div>
    )
  }

  if (category === 'magic_item') {
    const effects = Array.isArray(p.effects) ? (p.effects as string[]) : []
    return (
      <div className="space-y-1 pt-1 border-t border-outline-variant">
        {p.charges !== undefined ? <StatRow label="Charges" value={s(p.charges)} /> : null}
        {p.recharge ? <StatRow label="Recharge" value={s(p.recharge)} /> : null}
        {p.darkvision_range ? <StatRow label="Darkvision" value={`${s(p.darkvision_range)} ft`} /> : null}
        {p.ac_bonus ? <StatRow label="AC bonus" value={`+${s(p.ac_bonus)}`} /> : null}
        {p.saving_throw_bonus ? <StatRow label="Save bonus" value={`+${s(p.saving_throw_bonus)}`} /> : null}
        {p.capacity_weight ? <StatRow label="Capacity" value={`${s(p.capacity_weight)} lbs`} /> : null}
        {p.effect ? <StatRow label="Effect" value={s(p.effect)} /> : null}
        {effects.length > 0 && !p.effect ? <StatRow label="Effect" value={effects[0]} /> : null}
      </div>
    )
  }

  const ignoreKeys = new Set(['related_skills', 'note', 'application', 'ammunition_type', 'quantity', 'servings', 'pages', 'capacity_people', 'measures'])
  const displayPairs = Object.entries(p)
    .filter(([k, v]) => !ignoreKeys.has(k) && v !== null && v !== undefined && typeof v !== 'object')
    .slice(0, 4)

  if (displayPairs.length === 0) return null
  return (
    <div className="space-y-1 pt-1 border-t border-outline-variant">
      {displayPairs.map(([key, value]) => (
        <StatRow
          key={key}
          label={key.replace(/_/g, ' ')}
          value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : s(value)}
        />
      ))}
    </div>
  )
}
