'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { ItemLibrary } from '@/types/database'
import { SHOP_TAG_OPTIONS, WEAPON_PROPERTIES, DAMAGE_TYPES, RULESET_OPTIONS } from '@/lib/validators/item-library'

interface ItemLibraryFormProps {
  item?: ItemLibrary
}

const CATEGORY_OPTIONS = [
  { value: 'weapon',     label: 'Weapon' },
  { value: 'armor',      label: 'Armor' },
  { value: 'potion',     label: 'Potion' },
  { value: 'scroll',     label: 'Scroll' },
  { value: 'tool',       label: 'Tool' },
  { value: 'magic_item', label: 'Magic Item' },
  { value: 'misc',       label: 'Miscellaneous' },
] as const

const RARITY_OPTIONS = [
  { value: 'common',    label: 'Common' },
  { value: 'uncommon',  label: 'Uncommon' },
  { value: 'rare',      label: 'Rare' },
  { value: 'very_rare', label: 'Very Rare' },
  { value: 'legendary', label: 'Legendary' },
] as const

type Props = Record<string, unknown>

function getInitialProps(item?: ItemLibrary): Props {
  return (item?.properties as Props) ?? {}
}

export function ItemLibraryForm({ item }: ItemLibraryFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialProps = getInitialProps(item)

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [ruleset, setRuleset] = useState<string>(item?.ruleset ?? '5e')
  const [category, setCategory] = useState<string>(item?.category ?? '')
  const [rarity, setRarity] = useState<string>(item?.rarity ?? 'common')
  const [basePriceGp, setBasePriceGp] = useState(String(item?.base_price_gp ?? 0))
  const [weightLbs, setWeightLbs] = useState(String(item?.weight_lbs ?? ''))
  const [isMagical, setIsMagical] = useState(item?.is_magical ?? false)
  const [attunement, setAttunement] = useState(item?.attunement_required ?? false)
  const [cursed, setCursed] = useState(item?.cursed ?? false)
  const [shopTags, setShopTags] = useState<string[]>(item?.shop_tags ?? [])
  const [notes, setNotes] = useState(item?.notes ?? '')

  // Weapon fields
  const [damageDice, setDamageDice] = useState(String(initialProps.damage_dice ?? ''))
  const [damageType, setDamageType] = useState(String(initialProps.damage_type ?? 'slashing'))
  const [weaponCategory, setWeaponCategory] = useState(String(initialProps.weapon_category ?? 'simple'))
  const [weaponType, setWeaponType] = useState(String(initialProps.weapon_type ?? 'melee'))
  const [weaponProps, setWeaponProps] = useState<string[]>(
    Array.isArray(initialProps.properties) ? (initialProps.properties as string[]) : []
  )
  const [versatileDamage, setVersatileDamage] = useState(String(initialProps.versatile_damage ?? ''))
  const [rangeShort, setRangeShort] = useState(String(initialProps.range_short ?? ''))
  const [rangeLong, setRangeLong] = useState(String(initialProps.range_long ?? ''))

  // Armor fields
  const [armorClass, setArmorClass] = useState(String(initialProps.armor_class ?? ''))
  const [armorCategory, setArmorCategory] = useState(String(initialProps.armor_category ?? 'light'))
  const [maxDexBonus, setMaxDexBonus] = useState(
    initialProps.max_dex_bonus === null ? 'none' : String(initialProps.max_dex_bonus ?? '')
  )
  const [strRequirement, setStrRequirement] = useState(String(initialProps.str_requirement ?? 0))
  const [stealthDisadvantage, setStealthDisadvantage] = useState(
    Boolean(initialProps.stealth_disadvantage)
  )
  const [donTime, setDonTime] = useState(String(initialProps.don_time ?? ''))
  const [doffTime, setDoffTime] = useState(String(initialProps.doff_time ?? ''))

  // Potion fields
  const [healingDice, setHealingDice] = useState(String(initialProps.healing_dice ?? ''))
  const [healingBonus, setHealingBonus] = useState(String(initialProps.healing_bonus ?? ''))
  const [tempHp, setTempHp] = useState(String(initialProps.temp_hp ?? ''))
  const [potionEffect, setPotionEffect] = useState(String(initialProps.effect ?? ''))
  const [potionDuration, setPotionDuration] = useState(String(initialProps.duration ?? ''))

  // Scroll fields
  const [spellLevel, setSpellLevel] = useState(String(initialProps.spell_level ?? 1))
  const [saveDC, setSaveDC] = useState(String(initialProps.save_dc ?? ''))
  const [attackBonus, setAttackBonus] = useState(String(initialProps.attack_bonus ?? ''))

  // Magic item fields
  const [charges, setCharges] = useState(String(initialProps.charges ?? ''))
  const [recharge, setRecharge] = useState(String(initialProps.recharge ?? ''))
  const [acBonus, setAcBonus] = useState(String(initialProps.ac_bonus ?? ''))
  const [saveBonus, setSaveBonus] = useState(String(initialProps.saving_throw_bonus ?? ''))
  const [darkvision, setDarkvision] = useState(String(initialProps.darkvision_range ?? ''))
  const [magicEffect, setMagicEffect] = useState(String(initialProps.effect ?? ''))

  function buildProperties(): Record<string, unknown> | null {
    switch (category) {
      case 'weapon': {
        if (!damageDice) return null
        const p: Record<string, unknown> = {
          damage_dice: damageDice,
          damage_type: damageType,
          weapon_category: weaponCategory,
          weapon_type: weaponType,
          properties: weaponProps,
        }
        if (versatileDamage) p.versatile_damage = versatileDamage
        if (rangeShort) p.range_short = Number(rangeShort)
        if (rangeLong) p.range_long = Number(rangeLong)
        return p
      }
      case 'armor': {
        if (!armorClass) return null
        return {
          armor_class: Number(armorClass),
          armor_category: armorCategory,
          max_dex_bonus: maxDexBonus === 'none' ? null : Number(maxDexBonus),
          str_requirement: Number(strRequirement) || 0,
          stealth_disadvantage: stealthDisadvantage,
        }
      }
      case 'potion': {
        const p: Record<string, unknown> = {}
        if (healingDice) p.healing_dice = healingDice
        if (healingBonus) p.healing_bonus = Number(healingBonus)
        if (tempHp) p.temp_hp = Number(tempHp)
        if (potionEffect) p.effect = potionEffect
        if (potionDuration) p.duration = potionDuration
        return Object.keys(p).length ? p : null
      }
      case 'scroll': {
        const p: Record<string, unknown> = { spell_level: Number(spellLevel) }
        if (saveDC) p.save_dc = Number(saveDC)
        if (attackBonus) p.attack_bonus = Number(attackBonus)
        return p
      }
      case 'magic_item': {
        const p: Record<string, unknown> = {}
        if (charges) p.charges = Number(charges)
        if (recharge) p.recharge = recharge
        if (acBonus) p.ac_bonus = Number(acBonus)
        if (saveBonus) p.saving_throw_bonus = Number(saveBonus)
        if (darkvision) p.darkvision_range = Number(darkvision)
        if (magicEffect) p.effect = magicEffect
        return Object.keys(p).length ? p : null
      }
      default:
        return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (shopTags.length === 0) { setError('Select at least one shop type'); return }

    setIsSaving(true)
    setError(null)

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      ruleset,
      category: category as 'weapon' | 'armor' | 'potion' | 'scroll' | 'tool' | 'magic_item' | 'misc',
      rarity: rarity as 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary',
      base_price_gp: Number(basePriceGp) || 0,
      weight_lbs: weightLbs ? Number(weightLbs) : null,
      is_magical: isMagical,
      attunement_required: attunement,
      cursed,
      shop_tags: shopTags,
      notes: notes.trim() || undefined,
      weapon_props: category === 'weapon' ? {
        damage_dice: damageDice, damage_type: damageType,
        weapon_category: weaponCategory, weapon_type: weaponType,
        properties: weaponProps,
        ...(versatileDamage && { versatile_damage: versatileDamage }),
        ...(rangeShort && { range_short: Number(rangeShort) }),
        ...(rangeLong && { range_long: Number(rangeLong) }),
      } : undefined,
      armor_props: category === 'armor' ? {
        armor_class: Number(armorClass),
        armor_category: armorCategory,
        max_dex_bonus: maxDexBonus === 'none' ? null : Number(maxDexBonus),
        str_requirement: Number(strRequirement) || 0,
        stealth_disadvantage: stealthDisadvantage,
        ...(donTime && { don_time: donTime }),
        ...(doffTime && { doff_time: doffTime }),
      } : undefined,
      potion_props: category === 'potion' ? {
        ...(healingDice && { healing_dice: healingDice }),
        ...(healingBonus && { healing_bonus: Number(healingBonus) }),
        ...(tempHp && { temp_hp: Number(tempHp) }),
        ...(potionEffect && { effect: potionEffect }),
        ...(potionDuration && { duration: potionDuration }),
      } : undefined,
      scroll_props: category === 'scroll' ? {
        spell_level: Number(spellLevel),
        ...(saveDC && { save_dc: Number(saveDC) }),
        ...(attackBonus && { attack_bonus: Number(attackBonus) }),
      } : undefined,
      magic_item_props: category === 'magic_item' ? {
        ...(charges && { charges: Number(charges) }),
        ...(recharge && { recharge }),
        ...(acBonus && { ac_bonus: Number(acBonus) }),
        ...(saveBonus && { saving_throw_bonus: Number(saveBonus) }),
        ...(darkvision && { darkvision_range: Number(darkvision) }),
        ...(magicEffect && { effect: magicEffect }),
      } : undefined,
    }

    try {
      const url = item ? `/api/dm/items/${item.id}` : '/api/dm/items'
      const method = item ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { data: unknown; error: { message: string } | null }
      if (!res.ok || json.error) {
        setError(json.error?.message ?? 'Save failed')
      } else {
        router.push('/dm/items')
        router.refresh()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    if (!confirm(`Delete "${item.name}" from your library? This cannot be undone.`)) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/dm/items/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dm/items')
        router.refresh()
      } else {
        setError('Delete failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleWeaponProp = (prop: string) => {
    setWeaponProps(prev =>
      prev.includes(prop) ? prev.filter(p => p !== prop) : [...prev, prop]
    )
  }

  const toggleShopTag = (tag: string) => {
    setShopTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // Determine if item has ranged capability
  const isRanged = category === 'weapon' && (
    weaponType === 'ranged' || weaponProps.includes('thrown')
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="rounded-md bg-error/10 border border-error/30 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* ── Step 1: Ruleset & Category ─────────────────────────── */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
            Ruleset & Item Type
          </CardTitle>
          <CardDescription>First, choose your game system and what kind of item this is</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ruleset">Ruleset *</Label>
              <Select value={ruleset} onValueChange={setRuleset}>
                <SelectTrigger id="ruleset"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULESET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Determines which mechanics fields are available</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Item Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category"><SelectValue placeholder="Select a type..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!category && (
            <div className="rounded-md bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Select a category above to see the mechanical details fields</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: Basic Info ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
            Basic Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vorpal Longsword" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rarity">Rarity *</Label>
              <Select value={rarity} onValueChange={setRarity}>
                <SelectTrigger id="rarity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RARITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price">Base Price (gp) *</Label>
              <Input id="price" type="number" min={0} value={basePriceGp} onChange={e => setBasePriceGp(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input id="weight" type="number" min={0} step="0.1" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="0" />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Description / Lore</Label>
              <Textarea id="description" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Flavor text or lore the player sees" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={isMagical} onCheckedChange={(v: boolean) => setIsMagical(v)} />
              Magical
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={attunement} onCheckedChange={(v: boolean) => setAttunement(v)} />
              Requires attunement
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={cursed} onCheckedChange={(v: boolean) => setCursed(v)} />
              Cursed
            </label>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 3: Mechanical Stats (Crunchy Details) ─────────── */}
      {category === 'weapon' && (
        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold text-gold-foreground text-sm font-bold">3</span>
              Weapon Stats — {ruleset === '5e' ? 'D&D 5e' : ruleset}
            </CardTitle>
            <CardDescription>The mechanical details that matter in combat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="damage_dice">Damage Dice *</Label>
                <Input id="damage_dice" value={damageDice} onChange={e => setDamageDice(e.target.value)} placeholder="e.g. 1d8" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="damage_type">Damage Type *</Label>
                <Select value={damageType} onValueChange={setDamageType}>
                  <SelectTrigger id="damage_type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAMAGE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weapon_category">Proficiency</Label>
                <Select value={weaponCategory} onValueChange={setWeaponCategory}>
                  <SelectTrigger id="weapon_category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="martial">Martial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weapon_type">Type</Label>
                <Select value={weaponType} onValueChange={setWeaponType}>
                  <SelectTrigger id="weapon_type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="melee">Melee</SelectItem>
                    <SelectItem value="ranged">Ranged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Properties</Label>
              <div className="flex flex-wrap gap-3">
                {WEAPON_PROPERTIES.map(prop => (
                  <label key={prop} className="flex items-center gap-1.5 text-sm cursor-pointer capitalize">
                    <Checkbox checked={weaponProps.includes(prop)} onCheckedChange={() => toggleWeaponProp(prop)} />
                    {prop}
                  </label>
                ))}
              </div>
            </div>

            {weaponProps.includes('versatile') && (
              <div className="space-y-1.5">
                <Label htmlFor="versatile_damage">Versatile Damage (two-handed)</Label>
                <Input id="versatile_damage" value={versatileDamage} onChange={e => setVersatileDamage(e.target.value)} placeholder="e.g. 1d10" className="w-40" />
              </div>
            )}

            {isRanged && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="range_short">Short Range (ft)</Label>
                  <Input id="range_short" type="number" min={0} value={rangeShort} onChange={e => setRangeShort(e.target.value)} placeholder="30" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="range_long">Long Range (ft)</Label>
                  <Input id="range_long" type="number" min={0} value={rangeLong} onChange={e => setRangeLong(e.target.value)} placeholder="120" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {category === 'armor' && (
        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold text-gold-foreground text-sm font-bold">3</span>
              Armor Stats — {ruleset === '5e' ? 'D&D 5e' : ruleset}
            </CardTitle>
            <CardDescription>AC calculation, DEX limits, and movement penalties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="armor_class">Armor Class *</Label>
                <Input id="armor_class" type="number" min={1} max={30} value={armorClass} onChange={e => setArmorClass(e.target.value)} placeholder="e.g. 14" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="armor_category">Armor Category</Label>
                <Select value={armorCategory} onValueChange={setArmorCategory}>
                  <SelectTrigger id="armor_category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                    <SelectItem value="shield">Shield</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_dex">Max DEX Bonus</Label>
                <Select value={maxDexBonus} onValueChange={setMaxDexBonus}>
                  <SelectTrigger id="max_dex"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No limit (Light / Shield)</SelectItem>
                    <SelectItem value="2">+2 (Medium)</SelectItem>
                    <SelectItem value="0">None (Heavy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="str_req">STR Requirement</Label>
                <Input id="str_req" type="number" min={0} max={30} value={strRequirement} onChange={e => setStrRequirement(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="don_time">Don Time</Label>
                <Input id="don_time" value={donTime} onChange={e => setDonTime(e.target.value)} placeholder="e.g. 1 minute, 5 minutes, 1 action" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doff_time">Doff Time</Label>
                <Input id="doff_time" value={doffTime} onChange={e => setDoffTime(e.target.value)} placeholder="e.g. 1 minute, 5 minutes, 1 action" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={stealthDisadvantage} onCheckedChange={(v: boolean) => setStealthDisadvantage(v)} />
              Imposes stealth disadvantage
            </label>
          </CardContent>
        </Card>
      )}

      {category === 'potion' && (
        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold text-gold-foreground text-sm font-bold">3</span>
              Potion Effects — {ruleset === '5e' ? 'D&D 5e' : ruleset}
            </CardTitle>
            <CardDescription>Healing, temporary HP, duration, and effects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="healing_dice">Healing Dice</Label>
                <Input id="healing_dice" value={healingDice} onChange={e => setHealingDice(e.target.value)} placeholder="e.g. 2d4" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="healing_bonus">Healing Bonus</Label>
                <Input id="healing_bonus" type="number" min={0} value={healingBonus} onChange={e => setHealingBonus(e.target.value)} placeholder="e.g. 2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="temp_hp">Temp HP (instead of healing)</Label>
                <Input id="temp_hp" type="number" min={0} value={tempHp} onChange={e => setTempHp(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="potion_duration">Duration</Label>
                <Input id="potion_duration" value={potionDuration} onChange={e => setPotionDuration(e.target.value)} placeholder="e.g. 1 hour" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="potion_effect">Effect</Label>
                <Textarea id="potion_effect" rows={2} value={potionEffect} onChange={e => setPotionEffect(e.target.value)} placeholder="Brief mechanical description" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {category === 'scroll' && (
        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold text-gold-foreground text-sm font-bold">3</span>
              Scroll Stats — {ruleset === '5e' ? 'D&D 5e' : ruleset}
            </CardTitle>
            <CardDescription>Spell level, save DC, and attack modifiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="spell_level">Spell Level</Label>
                <Select value={spellLevel} onValueChange={setSpellLevel}>
                  <SelectTrigger id="spell_level"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Cantrip (0)</SelectItem>
                    {[1,2,3,4,5,6,7,8,9].map(l => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="save_dc">Save DC</Label>
                <Input id="save_dc" type="number" min={1} max={30} value={saveDC} onChange={e => setSaveDC(e.target.value)} placeholder="13" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="attack_bonus">Attack Bonus</Label>
                <Input id="attack_bonus" type="number" min={0} max={20} value={attackBonus} onChange={e => setAttackBonus(e.target.value)} placeholder="5" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {category === 'magic_item' && (
        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold text-gold-foreground text-sm font-bold">3</span>
              Magic Item Stats — {ruleset === '5e' ? 'D&D 5e' : ruleset}
            </CardTitle>
            <CardDescription>Charges, bonuses, and special abilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="charges">Charges</Label>
                <Input id="charges" type="number" min={0} value={charges} onChange={e => setCharges(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recharge">Recharge</Label>
                <Input id="recharge" value={recharge} onChange={e => setRecharge(e.target.value)} placeholder="e.g. dawn, dusk, short rest" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac_bonus">AC Bonus</Label>
                <Input id="ac_bonus" type="number" min={0} value={acBonus} onChange={e => setAcBonus(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="save_bonus">Saving Throw Bonus</Label>
                <Input id="save_bonus" type="number" min={0} value={saveBonus} onChange={e => setSaveBonus(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="darkvision">Darkvision Range (ft)</Label>
                <Input id="darkvision" type="number" min={0} value={darkvision} onChange={e => setDarkvision(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="magic_effect">Effect / Ability</Label>
              <Textarea id="magic_effect" rows={3} value={magicEffect} onChange={e => setMagicEffect(e.target.value)} placeholder="Describe what the item does mechanically" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Shop Tags & DM Notes ─────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</span>
            Shop Tags & Notes
          </CardTitle>
          <CardDescription>Tag which shops stock this item and add private notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Shop Tags * <span className="text-muted-foreground font-normal">— Which shops stock this?</span></Label>
            <div className="flex flex-wrap gap-4">
              {SHOP_TAG_OPTIONS.map(tag => (
                <label key={tag.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={shopTags.includes(tag.value)}
                    onCheckedChange={(_: boolean) => toggleShopTag(tag.value)}
                  />
                  {tag.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">DM Notes <span className="text-muted-foreground font-normal">— Private, never shown to players</span></Label>
            <Textarea id="notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="House rules, quest hooks, backstory..." />
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSaving || isDeleting}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {item ? 'Save Changes' : 'Add to Library'}
          </Button>
          <Button asChild variant="outline" disabled={isSaving || isDeleting}>
            <Link href="/dm/items">Cancel</Link>
          </Button>
        </div>
        {item && (
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting || isSaving}
            onClick={handleDelete}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
