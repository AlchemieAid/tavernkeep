-- ============================================================
-- catalog_items: Pre-built reference item catalog
-- Supports reliable shop inventory generation across RPG systems.
-- Items are tagged by shop_tags[] matching the shop_type enum.
-- system_stats JSONB holds all system-specific mechanical stats.
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  ruleset             TEXT NOT NULL DEFAULT '5e',
  category            item_category NOT NULL,
  rarity              item_rarity NOT NULL DEFAULT 'common',
  base_price          INTEGER NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  price_currency      TEXT NOT NULL DEFAULT 'gp',
  weight              REAL,
  is_magical          BOOLEAN NOT NULL DEFAULT FALSE,
  requires_attunement BOOLEAN NOT NULL DEFAULT FALSE,
  shop_tags           TEXT[] NOT NULL DEFAULT '{}',
  source_book         TEXT DEFAULT 'PHB',
  system_stats        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- Anyone (auth + anon) can read catalog items
CREATE POLICY "catalog_items_read_all" ON catalog_items FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_catalog_items_ruleset ON catalog_items(ruleset);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_rarity ON catalog_items(rarity);
CREATE INDEX IF NOT EXISTS idx_catalog_items_shop_tags ON catalog_items USING GIN(shop_tags);
CREATE INDEX IF NOT EXISTS idx_catalog_items_system_stats ON catalog_items USING GIN(system_stats);

COMMENT ON TABLE catalog_items IS 'Pre-built item catalog for reliable shop inventory across RPG systems. Items are tagged by shop_tags array matching shop_type enum values.';
COMMENT ON COLUMN catalog_items.shop_tags IS 'Which shop types stock this item: general, weapons, armor, magic, apothecary, black_market';
COMMENT ON COLUMN catalog_items.system_stats IS 'System-specific mechanical stats as JSONB — shape varies by ruleset. 5e: weapons have damage_dice/damage_type/properties; armor has armor_class/max_dex_bonus/str_requirement etc.';
COMMENT ON COLUMN catalog_items.base_price IS 'Base price in the primary currency unit for the ruleset (gp for 5e, Cr for Traveler, $ for GURPS).';

-- ============================================================
-- SEED DATA: D&D 5e SRD Items
-- Coverage: weapons (30+), armor (13), apothecary (16),
--           scrolls (5), magic items (13), general gear (25+),
--           tools (5), black market (6)
-- ============================================================

INSERT INTO catalog_items (name, description, ruleset, category, rarity, base_price, price_currency, weight, is_magical, requires_attunement, shop_tags, source_book, system_stats) VALUES
-- SIMPLE MELEE WEAPONS
('Club', 'A length of wood used as a bludgeoning weapon.', '5e', 'weapon', 'common', 1, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d4","damage_type":"bludgeoning","weapon_category":"simple","weapon_type":"melee","properties":["light"]}'),
('Dagger', 'A short blade ideal for close quarters.', '5e', 'weapon', 'common', 2, 'gp', 1.0, false, false, ARRAY['weapons','general','black_market'], 'PHB', '{"damage_dice":"1d4","damage_type":"piercing","weapon_category":"simple","weapon_type":"melee","properties":["finesse","light","thrown"],"range_short":20,"range_long":60}'),
('Greatclub', 'A massive two-handed club hewn from a heavy branch.', '5e', 'weapon', 'common', 1, 'gp', 10.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d8","damage_type":"bludgeoning","weapon_category":"simple","weapon_type":"melee","properties":["two-handed"]}'),
('Handaxe', 'A light axe designed for throwing as well as melee.', '5e', 'weapon', 'common', 5, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d6","damage_type":"slashing","weapon_category":"simple","weapon_type":"melee","properties":["light","thrown"],"range_short":20,"range_long":60}'),
('Javelin', 'A light spear designed primarily for throwing.', '5e', 'weapon', 'common', 1, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d6","damage_type":"piercing","weapon_category":"simple","weapon_type":"melee","properties":["thrown"],"range_short":30,"range_long":120}'),
('Light Hammer', 'A small hammer light enough to be thrown.', '5e', 'weapon', 'common', 2, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d4","damage_type":"bludgeoning","weapon_category":"simple","weapon_type":"melee","properties":["light","thrown"],"range_short":20,"range_long":60}'),
('Mace', 'A weapon with a heavy head on a handle.', '5e', 'weapon', 'common', 5, 'gp', 4.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d6","damage_type":"bludgeoning","weapon_category":"simple","weapon_type":"melee","properties":[]}'),
('Quarterstaff', 'A stout wooden staff, one or two-handed.', '5e', 'weapon', 'common', 1, 'gp', 4.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d6","damage_type":"bludgeoning","weapon_category":"simple","weapon_type":"melee","properties":["versatile"],"versatile_damage":"1d8"}'),
('Sickle', 'A curved blade used for harvesting or as a weapon.', '5e', 'weapon', 'common', 1, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d4","damage_type":"slashing","weapon_category":"simple","weapon_type":"melee","properties":["light"]}'),
('Spear', 'A pole weapon with a pointed head.', '5e', 'weapon', 'common', 1, 'gp', 3.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d6","damage_type":"piercing","weapon_category":"simple","weapon_type":"melee","properties":["thrown","versatile"],"versatile_damage":"1d8","range_short":20,"range_long":60}'),
-- SIMPLE RANGED
('Light Crossbow', 'A mechanically loaded crossbow.', '5e', 'weapon', 'common', 25, 'gp', 5.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d8","damage_type":"piercing","weapon_category":"simple","weapon_type":"ranged","properties":["ammunition","loading","two-handed"],"range_short":80,"range_long":320}'),
('Shortbow', 'A small bow light enough to use while mounted.', '5e', 'weapon', 'common', 25, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d6","damage_type":"piercing","weapon_category":"simple","weapon_type":"ranged","properties":["ammunition","two-handed"],"range_short":80,"range_long":320}'),
('Sling', 'A leather strip used to hurl stones.', '5e', 'weapon', 'common', 1, 'gp', 0.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d4","damage_type":"bludgeoning","weapon_category":"simple","weapon_type":"ranged","properties":["ammunition"],"range_short":30,"range_long":120}'),
-- MARTIAL MELEE
('Battleaxe', 'A single-bladed axe favored by fighters.', '5e', 'weapon', 'common', 10, 'gp', 4.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d8","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["versatile"],"versatile_damage":"1d10"}'),
('Flail', 'A spiked ball on a chain. Difficult to block.', '5e', 'weapon', 'common', 10, 'gp', 2.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d8","damage_type":"bludgeoning","weapon_category":"martial","weapon_type":"melee","properties":[]}'),
('Glaive', 'A long-hafted blade. Excellent reach.', '5e', 'weapon', 'common', 20, 'gp', 6.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d10","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["heavy","reach","two-handed"]}'),
('Greataxe', 'A massive two-handed axe.', '5e', 'weapon', 'common', 30, 'gp', 7.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d12","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["heavy","two-handed"]}'),
('Greatsword', 'A heavy two-handed blade for raw power.', '5e', 'weapon', 'common', 50, 'gp', 6.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"2d6","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["heavy","two-handed"]}'),
('Halberd', 'A polearm combining spearhead and axe blade.', '5e', 'weapon', 'common', 20, 'gp', 6.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d10","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["heavy","reach","two-handed"]}'),
('Longsword', 'The quintessential knightly sword.', '5e', 'weapon', 'common', 15, 'gp', 3.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d8","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["versatile"],"versatile_damage":"1d10"}'),
('Maul', 'A massive two-handed hammer.', '5e', 'weapon', 'common', 10, 'gp', 10.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"2d6","damage_type":"bludgeoning","weapon_category":"martial","weapon_type":"melee","properties":["heavy","two-handed"]}'),
('Morningstar', 'A heavy spiked ball on a handle.', '5e', 'weapon', 'common', 15, 'gp', 4.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d8","damage_type":"piercing","weapon_category":"martial","weapon_type":"melee","properties":[]}'),
('Rapier', 'A slender duelist''s blade.', '5e', 'weapon', 'common', 25, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d8","damage_type":"piercing","weapon_category":"martial","weapon_type":"melee","properties":["finesse"]}'),
('Scimitar', 'A curved blade for finesse fighters.', '5e', 'weapon', 'common', 25, 'gp', 3.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d6","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["finesse","light"]}'),
('Shortsword', 'A compact blade ideal for dual wielding.', '5e', 'weapon', 'common', 10, 'gp', 2.0, false, false, ARRAY['weapons','general','black_market'], 'PHB', '{"damage_dice":"1d6","damage_type":"piercing","weapon_category":"martial","weapon_type":"melee","properties":["finesse","light"]}'),
('Trident', 'A three-pronged spear, thrown or melee.', '5e', 'weapon', 'common', 5, 'gp', 4.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d6","damage_type":"piercing","weapon_category":"martial","weapon_type":"melee","properties":["thrown","versatile"],"versatile_damage":"1d8","range_short":20,"range_long":60}'),
('War Pick', 'A military pick designed to punch through armor.', '5e', 'weapon', 'common', 5, 'gp', 2.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d8","damage_type":"piercing","weapon_category":"martial","weapon_type":"melee","properties":[]}'),
('Warhammer', 'A one or two-handed bludgeoning weapon.', '5e', 'weapon', 'common', 15, 'gp', 2.0, false, false, ARRAY['weapons','general'], 'PHB', '{"damage_dice":"1d8","damage_type":"bludgeoning","weapon_category":"martial","weapon_type":"melee","properties":["versatile"],"versatile_damage":"1d10"}'),
('Whip', 'A flexible lash with reach.', '5e', 'weapon', 'common', 2, 'gp', 3.0, false, false, ARRAY['weapons','black_market'], 'PHB', '{"damage_dice":"1d4","damage_type":"slashing","weapon_category":"martial","weapon_type":"melee","properties":["finesse","reach"]}'),
-- MARTIAL RANGED
('Hand Crossbow', 'A compact one-handed crossbow.', '5e', 'weapon', 'common', 75, 'gp', 3.0, false, false, ARRAY['weapons','black_market'], 'PHB', '{"damage_dice":"1d6","damage_type":"piercing","weapon_category":"martial","weapon_type":"ranged","properties":["ammunition","light","loading"],"range_short":30,"range_long":120}'),
('Heavy Crossbow', 'A powerful two-handed crossbow.', '5e', 'weapon', 'common', 50, 'gp', 18.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d10","damage_type":"piercing","weapon_category":"martial","weapon_type":"ranged","properties":["ammunition","heavy","loading","two-handed"],"range_short":100,"range_long":400}'),
('Longbow', 'A tall wooden bow with great range.', '5e', 'weapon', 'common', 50, 'gp', 2.0, false, false, ARRAY['weapons'], 'PHB', '{"damage_dice":"1d8","damage_type":"piercing","weapon_category":"martial","weapon_type":"ranged","properties":["ammunition","heavy","two-handed"],"range_short":150,"range_long":600}'),
('Arrows (20)', 'A quiver of twenty standard arrows.', '5e', 'misc', 'common', 1, 'gp', 1.0, false, false, ARRAY['weapons','general'], 'PHB', '{"ammunition_type":"arrow","quantity":20}'),
('Crossbow Bolts (20)', 'Twenty bolts for any crossbow.', '5e', 'misc', 'common', 1, 'gp', 1.5, false, false, ARRAY['weapons','general'], 'PHB', '{"ammunition_type":"bolt","quantity":20}'),
-- ARMOR (Light)
('Padded Armor', 'Quilted layers of cloth and batting.', '5e', 'armor', 'common', 5, 'gp', 8.0, false, false, ARRAY['armor','general'], 'PHB', '{"armor_class":11,"armor_category":"light","max_dex_bonus":null,"str_requirement":0,"stealth_disadvantage":true,"don_time":"1 minute","doff_time":"1 minute"}'),
('Leather Armor', 'Hardened leather breastplate and shoulder protectors.', '5e', 'armor', 'common', 10, 'gp', 10.0, false, false, ARRAY['armor','general'], 'PHB', '{"armor_class":11,"armor_category":"light","max_dex_bonus":null,"str_requirement":0,"stealth_disadvantage":false,"don_time":"1 minute","doff_time":"1 minute"}'),
('Studded Leather Armor', 'Leather reinforced with close-set rivets.', '5e', 'armor', 'common', 45, 'gp', 13.0, false, false, ARRAY['armor','general'], 'PHB', '{"armor_class":12,"armor_category":"light","max_dex_bonus":null,"str_requirement":0,"stealth_disadvantage":false,"don_time":"1 minute","doff_time":"1 minute"}'),
-- ARMOR (Medium)
('Hide Armor', 'Crude armor made from thick furs and pelts.', '5e', 'armor', 'common', 10, 'gp', 12.0, false, false, ARRAY['armor','general'], 'PHB', '{"armor_class":12,"armor_category":"medium","max_dex_bonus":2,"str_requirement":0,"stealth_disadvantage":false,"don_time":"5 minutes","doff_time":"1 minute"}'),
('Chain Shirt', 'Interlocking metal rings worn beneath garments.', '5e', 'armor', 'common', 50, 'gp', 20.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":13,"armor_category":"medium","max_dex_bonus":2,"str_requirement":0,"stealth_disadvantage":false,"don_time":"5 minutes","doff_time":"1 minute"}'),
('Scale Mail', 'Overlapping metal scales over leather.', '5e', 'armor', 'common', 50, 'gp', 45.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":14,"armor_category":"medium","max_dex_bonus":2,"str_requirement":0,"stealth_disadvantage":true,"don_time":"5 minutes","doff_time":"1 minute"}'),
('Breastplate', 'A fitted metal chest piece over leather.', '5e', 'armor', 'common', 400, 'gp', 20.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":14,"armor_category":"medium","max_dex_bonus":2,"str_requirement":0,"stealth_disadvantage":false,"don_time":"5 minutes","doff_time":"1 minute"}'),
('Half Plate', 'Shaped metal plates covering most of the body.', '5e', 'armor', 'common', 750, 'gp', 40.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":15,"armor_category":"medium","max_dex_bonus":2,"str_requirement":0,"stealth_disadvantage":true,"don_time":"5 minutes","doff_time":"1 minute"}'),
-- ARMOR (Heavy)
('Ring Mail', 'Leather armor with heavy rings sewn into it.', '5e', 'armor', 'common', 30, 'gp', 40.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":14,"armor_category":"heavy","max_dex_bonus":0,"str_requirement":0,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'),
('Chain Mail', 'A complete suit of interlocking metal rings.', '5e', 'armor', 'common', 75, 'gp', 55.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":16,"armor_category":"heavy","max_dex_bonus":0,"str_requirement":13,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'),
('Splint Armor', 'Narrow vertical strips of metal on leather.', '5e', 'armor', 'common', 200, 'gp', 60.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":17,"armor_category":"heavy","max_dex_bonus":0,"str_requirement":15,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'),
('Plate Armor', 'Full plate of shaped metal. The finest mundane protection.', '5e', 'armor', 'common', 1500, 'gp', 65.0, false, false, ARRAY['armor'], 'PHB', '{"armor_class":18,"armor_category":"heavy","max_dex_bonus":0,"str_requirement":15,"stealth_disadvantage":true,"don_time":"10 minutes","doff_time":"5 minutes"}'),
('Shield', 'A wooden or metal shield. Grants +2 AC.', '5e', 'armor', 'common', 10, 'gp', 6.0, false, false, ARRAY['armor','general'], 'PHB', '{"armor_class":2,"armor_category":"shield","ac_type":"bonus","max_dex_bonus":null,"str_requirement":0,"stealth_disadvantage":false,"don_time":"1 action","doff_time":"1 action"}'),
-- POTIONS & APOTHECARY
('Potion of Healing', 'A red liquid. Restores 2d4+2 hit points.', '5e', 'potion', 'common', 50, 'gp', 1.0, true, false, ARRAY['apothecary','general','magic'], 'PHB', '{"healing_dice":"2d4","healing_bonus":2,"duration":"instantaneous"}'),
('Potion of Greater Healing', 'Restores 4d4+4 hit points.', '5e', 'potion', 'uncommon', 150, 'gp', 1.0, true, false, ARRAY['apothecary','magic'], 'DMG', '{"healing_dice":"4d4","healing_bonus":4,"duration":"instantaneous"}'),
('Potion of Superior Healing', 'Restores 8d4+8 hit points.', '5e', 'potion', 'rare', 500, 'gp', 1.0, true, false, ARRAY['apothecary','magic'], 'DMG', '{"healing_dice":"8d4","healing_bonus":8,"duration":"instantaneous"}'),
('Antitoxin', 'Advantage on saving throws against poison for 1 hour.', '5e', 'potion', 'common', 50, 'gp', 0.0, false, false, ARRAY['apothecary','general'], 'PHB', '{"effect":"Advantage on saving throws against poison","duration":"1 hour"}'),
('Alchemist''s Fire', 'Adhesive fluid that ignites on contact with air. 1d4 fire damage per round.', '5e', 'misc', 'common', 50, 'gp', 1.0, false, false, ARRAY['apothecary','black_market'], 'PHB', '{"damage_dice":"1d4","damage_type":"fire","duration":"until extinguished (DC 10 Dex)"}'),
('Acid (Vial)', 'Corrosive acid. 2d6 acid damage on a hit (range 20 ft).', '5e', 'misc', 'common', 25, 'gp', 1.0, false, false, ARRAY['apothecary','black_market'], 'PHB', '{"damage_dice":"2d6","damage_type":"acid","range":20}'),
('Holy Water (Flask)', 'Blessed water. 2d6 radiant damage to undead and fiends.', '5e', 'misc', 'common', 25, 'gp', 1.0, false, false, ARRAY['apothecary','general'], 'PHB', '{"damage_dice":"2d6","damage_type":"radiant","range":20}'),
('Healer''s Kit', '10 uses. Stabilize a dying creature without a Medicine check.', '5e', 'tool', 'common', 5, 'gp', 3.0, false, false, ARRAY['apothecary','general'], 'PHB', '{"uses":10,"effect":"Stabilize dying creature without Medicine check"}'),
('Herbalism Kit', 'Identify plants and prepare herbal remedies.', '5e', 'tool', 'common', 5, 'gp', 3.0, false, false, ARRAY['apothecary','general'], 'PHB', '{"related_skills":["Nature","Medicine"]}'),
('Potion of Climbing', 'Gain climb speed equal to walking speed, advantage on Athletics for 1 hour.', '5e', 'potion', 'common', 180, 'gp', 1.0, true, false, ARRAY['apothecary','magic'], 'DMG', '{"effect":"Climb speed equals walking speed, advantage on Athletics","duration":"1 hour"}'),
('Potion of Water Breathing', 'Breathe underwater for 1 hour.', '5e', 'potion', 'uncommon', 180, 'gp', 1.0, true, false, ARRAY['apothecary','magic'], 'DMG', '{"effect":"Breathe underwater","duration":"1 hour"}'),
('Potion of Heroism', 'Gain 10 temp HP and the Bless effect for 1 hour.', '5e', 'potion', 'uncommon', 180, 'gp', 1.0, true, false, ARRAY['apothecary','magic'], 'DMG', '{"temp_hp":10,"effect":"Gain 10 temp HP and Bless","duration":"1 hour"}'),
('Basic Poison (Vial)', 'DC 10 Constitution save or 1d4 poison damage per minute.', '5e', 'misc', 'uncommon', 100, 'gp', 0.0, false, false, ARRAY['apothecary','black_market'], 'PHB', '{"save_dc":10,"damage_dice":"1d4","damage_type":"poison","duration":"1 minute"}'),
('Alchemist''s Supplies', 'Mortar, pestle, and components for brewing and alchemy.', '5e', 'tool', 'common', 50, 'gp', 8.0, false, false, ARRAY['apothecary'], 'PHB', '{"related_skills":["Arcana","Investigation"]}'),
('Poisoner''s Kit', 'Tools to harvest, identify, and apply poisons.', '5e', 'tool', 'uncommon', 50, 'gp', 2.0, false, false, ARRAY['apothecary','black_market'], 'PHB', '{"related_skills":["Nature","Medicine"]}'),
-- SPELL SCROLLS
('Spell Scroll (Cantrip)', 'A single-use scroll inscribed with a cantrip.', '5e', 'scroll', 'common', 25, 'gp', 0.0, true, false, ARRAY['magic'], 'DMG', '{"spell_level":0,"save_dc":13,"attack_bonus":5}'),
('Spell Scroll (1st Level)', 'A scroll containing a 1st-level spell.', '5e', 'scroll', 'common', 75, 'gp', 0.0, true, false, ARRAY['magic'], 'DMG', '{"spell_level":1,"usage_note":"DC 10 Int check if not on your spell list","save_dc":13,"attack_bonus":5}'),
('Spell Scroll (2nd Level)', 'A scroll containing a 2nd-level spell.', '5e', 'scroll', 'uncommon', 150, 'gp', 0.0, true, false, ARRAY['magic'], 'DMG', '{"spell_level":2,"usage_note":"DC 12 Int check if not on your spell list","save_dc":13,"attack_bonus":5}'),
('Spell Scroll (3rd Level)', 'A scroll inscribed with a 3rd-level spell.', '5e', 'scroll', 'uncommon', 300, 'gp', 0.0, true, false, ARRAY['magic'], 'DMG', '{"spell_level":3,"usage_note":"DC 13 Int check if not on your spell list","save_dc":15,"attack_bonus":7}'),
('Spell Scroll (4th Level)', 'A carefully inscribed 4th-level spell scroll.', '5e', 'scroll', 'rare', 500, 'gp', 0.0, true, false, ARRAY['magic'], 'DMG', '{"spell_level":4,"usage_note":"DC 14 Int check if not on your spell list","save_dc":15,"attack_bonus":7}'),
-- MAGIC ITEMS
('Component Pouch', 'A watertight pouch with material spell components.', '5e', 'misc', 'common', 25, 'gp', 2.0, false, false, ARRAY['magic','general'], 'PHB', '{"effect":"Replaces material components for spells that cost nothing"}'),
('Arcane Focus (Crystal)', 'A prism crystal spellcasting focus.', '5e', 'misc', 'common', 10, 'gp', 1.0, false, false, ARRAY['magic','general'], 'PHB', '{"focus_type":"crystal"}'),
('Arcane Focus (Orb)', 'A glass or crystal sphere spellcasting focus.', '5e', 'misc', 'common', 20, 'gp', 3.0, false, false, ARRAY['magic','general'], 'PHB', '{"focus_type":"orb"}'),
('Arcane Focus (Wand)', 'A slender carved wood spellcasting focus.', '5e', 'misc', 'common', 10, 'gp', 1.0, false, false, ARRAY['magic','general'], 'PHB', '{"focus_type":"wand"}'),
('Spellbook', 'A leather-bound tome with 100 vellum pages for spell formulae.', '5e', 'misc', 'common', 50, 'gp', 3.0, false, false, ARRAY['magic','general'], 'PHB', '{"pages":100}'),
('Holy Symbol', 'A divine spellcasting focus for clerics and paladins.', '5e', 'misc', 'common', 5, 'gp', 1.0, false, false, ARRAY['general','magic'], 'PHB', '{"effect":"Divine spellcasting focus"}'),
('Bag of Holding', 'Extradimensional bag. Holds up to 500 lbs, 64 cubic feet.', '5e', 'magic_item', 'uncommon', 4000, 'gp', 15.0, true, false, ARRAY['magic'], 'DMG', '{"capacity_weight":500,"capacity_volume":"64 cubic feet"}'),
('Cloak of Protection', '+1 to AC and all saving throws.', '5e', 'magic_item', 'uncommon', 3500, 'gp', 1.0, true, true, ARRAY['magic'], 'DMG', '{"ac_bonus":1,"saving_throw_bonus":1}'),
('Wand of Magic Missiles', '7 charges. Expend 1–3 to launch 1–3 magic missiles.', '5e', 'magic_item', 'uncommon', 3500, 'gp', 1.0, true, false, ARRAY['magic'], 'DMG', '{"charges":7,"recharge":"1d6+1 at dawn"}'),
('Goggles of Night', 'Grant 60 feet of darkvision.', '5e', 'magic_item', 'uncommon', 1500, 'gp', 1.0, true, false, ARRAY['magic'], 'DMG', '{"darkvision_range":60}'),
('Helm of Comprehending Languages', 'Understand any spoken or written language.', '5e', 'magic_item', 'uncommon', 500, 'gp', 3.0, true, false, ARRAY['magic'], 'DMG', '{"effect":"Comprehend Languages at will"}'),
('Immovable Rod', 'Fixed in space when activated. Supports 8,000 lbs.', '5e', 'magic_item', 'uncommon', 5000, 'gp', 2.0, true, false, ARRAY['magic'], 'DMG', '{"max_weight":8000}'),
('Ring of Warmth', 'Resistance to cold damage. Comfortable in extreme cold.', '5e', 'magic_item', 'uncommon', 1000, 'gp', 0.0, true, true, ARRAY['magic'], 'DMG', '{"damage_resistance":"cold"}'),
('Rope of Climbing', 'A 60-ft silk rope that animates and ties itself on command.', '5e', 'magic_item', 'uncommon', 2000, 'gp', 3.0, true, false, ARRAY['magic','general'], 'DMG', '{"length_ft":60}'),
('Boots of Elvenkind', 'Advantage on Stealth checks to move silently.', '5e', 'magic_item', 'uncommon', 2500, 'gp', 1.0, true, false, ARRAY['magic'], 'DMG', '{"effect":"Advantage on Dexterity (Stealth) checks"}'),
('Hat of Disguise', 'Cast Disguise Self at will.', '5e', 'magic_item', 'uncommon', 5000, 'gp', 1.0, true, true, ARRAY['magic','black_market'], 'DMG', '{"effect":"Disguise Self at will"}'),
('Wand of Secrets', '3 charges. Detect secret doors and traps within 30 ft.', '5e', 'magic_item', 'uncommon', 1500, 'gp', 1.0, true, false, ARRAY['magic'], 'DMG', '{"charges":3,"recharge":"1d3 at dawn"}'),
('Lantern of Revealing', 'Makes invisible creatures visible within its light (30 ft).', '5e', 'magic_item', 'uncommon', 5000, 'gp', 2.0, true, false, ARRAY['magic'], 'DMG', '{"bright_light_ft":30}'),
-- GENERAL ADVENTURING GEAR
('Backpack', 'Holds 30 lbs (1 cubic foot) of gear.', '5e', 'misc', 'common', 2, 'gp', 5.0, false, false, ARRAY['general'], 'PHB', '{"capacity_weight":30,"capacity_volume":"1 cubic foot"}'),
('Bedroll', 'A rolled canvas sleeping mat with a blanket.', '5e', 'misc', 'common', 1, 'gp', 7.0, false, false, ARRAY['general'], 'PHB', null),
('Blanket', 'A thick wool blanket for cold nights.', '5e', 'misc', 'common', 1, 'gp', 3.0, false, false, ARRAY['general'], 'PHB', null),
('Hempen Rope (50 ft)', 'Sturdy rope. 2 HP, DC 17 Strength to burst.', '5e', 'misc', 'common', 1, 'gp', 10.0, false, false, ARRAY['general'], 'PHB', '{"length_ft":50,"hp":2,"burst_dc":17}'),
('Silk Rope (50 ft)', 'Lighter and stronger than hemp.', '5e', 'misc', 'common', 10, 'gp', 5.0, false, false, ARRAY['general'], 'PHB', '{"length_ft":50,"hp":2,"burst_dc":17}'),
('Torch', 'Burns 1 hour. Bright light 20 ft, dim 20 ft more.', '5e', 'misc', 'common', 1, 'gp', 1.0, false, false, ARRAY['general'], 'PHB', '{"bright_light_ft":20,"dim_light_ft":20,"duration_hours":1}'),
('Waterskin', 'Holds up to 4 pints of liquid.', '5e', 'misc', 'common', 1, 'gp', 5.0, false, false, ARRAY['general'], 'PHB', '{"capacity_pints":4}'),
('Rations (1 day)', 'Hardtack, jerked beef, dried fruit, and cheese.', '5e', 'misc', 'common', 1, 'gp', 2.0, false, false, ARRAY['general'], 'PHB', null),
('Tent, Two-Person', 'A portable canvas shelter for two.', '5e', 'misc', 'common', 2, 'gp', 20.0, false, false, ARRAY['general'], 'PHB', '{"capacity_people":2}'),
('Candle', 'Burns 1 hour. Bright light 5 ft, dim 5 ft more.', '5e', 'misc', 'common', 1, 'gp', 0.0, false, false, ARRAY['general'], 'PHB', '{"bright_light_ft":5,"dim_light_ft":5,"duration_hours":1}'),
('Crowbar', 'Advantage on Strength checks where leverage applies.', '5e', 'misc', 'common', 2, 'gp', 5.0, false, false, ARRAY['general'], 'PHB', null),
('Grappling Hook', 'A three-pronged iron hook for climbing.', '5e', 'misc', 'common', 2, 'gp', 4.0, false, false, ARRAY['general'], 'PHB', null),
('Hammer', 'A standard iron-headed hammer.', '5e', 'misc', 'common', 1, 'gp', 3.0, false, false, ARRAY['general'], 'PHB', null),
('Hooded Lantern', 'Burns oil 6 hrs. Bright 30 ft, dim 30 ft more.', '5e', 'misc', 'common', 5, 'gp', 2.0, false, false, ARRAY['general'], 'PHB', '{"bright_light_ft":30,"dim_light_ft":30,"duration_hours":6}'),
('Bullseye Lantern', 'Burns oil 6 hrs. 60-ft bright cone, 60 ft dim beyond.', '5e', 'misc', 'common', 10, 'gp', 2.0, false, false, ARRAY['general'], 'PHB', '{"bright_cone_ft":60,"dim_light_ft":60,"duration_hours":6}'),
('Steel Mirror', 'A polished hand mirror.', '5e', 'misc', 'common', 5, 'gp', 1.0, false, false, ARRAY['general'], 'PHB', null),
('Oil (Flask)', 'Lamp oil. Can be thrown to create a burning patch.', '5e', 'misc', 'common', 1, 'gp', 1.0, false, false, ARRAY['general'], 'PHB', null),
('Tinderbox', 'Flint, steel, and tinder. Light a fire in 1 minute.', '5e', 'misc', 'common', 1, 'gp', 1.0, false, false, ARRAY['general'], 'PHB', null),
('Hunting Trap', 'Steel-jawed trap. Restrain Medium/smaller creature (DC 13).', '5e', 'misc', 'common', 5, 'gp', 25.0, false, false, ARRAY['general'], 'PHB', '{"escape_dc":13,"damage":"1d4 piercing"}'),
('Thieves'' Tools', 'Lock picks, small mirror, scissors. Pick locks and disarm traps.', '5e', 'tool', 'common', 25, 'gp', 1.0, false, false, ARRAY['general','black_market'], 'PHB', '{"related_skills":["Sleight of Hand","Dexterity (Thieves Tools)"]}'),
('Common Clothes', 'A simple outfit: shirt, breeches, shoes.', '5e', 'misc', 'common', 1, 'gp', 3.0, false, false, ARRAY['general'], 'PHB', null),
('Traveler''s Clothes', 'Sturdy clothes for long journeys.', '5e', 'misc', 'common', 2, 'gp', 4.0, false, false, ARRAY['general'], 'PHB', null),
('Fine Clothes', 'Elegant clothing for court or formal occasions.', '5e', 'misc', 'common', 15, 'gp', 6.0, false, false, ARRAY['general'], 'PHB', null),
('Caltrops (Bag of 20)', '5-ft square. DC 15 Dex save or stop and take 1 piercing.', '5e', 'misc', 'common', 1, 'gp', 2.0, false, false, ARRAY['general','black_market'], 'PHB', '{"save_dc":15,"damage":"1 piercing","area_ft":5}'),
('Fishing Tackle', 'Rod, line, hooks, sinkers, and bobbers.', '5e', 'misc', 'common', 1, 'gp', 4.0, false, false, ARRAY['general'], 'PHB', null),
('Lock', 'An iron padlock with matching key. DC 15 to pick.', '5e', 'misc', 'common', 10, 'gp', 1.0, false, false, ARRAY['general'], 'PHB', '{"dc_to_pick":15}'),
('Manacles', 'Iron shackles. Escape DC 20 Dex (tools) or Str.', '5e', 'misc', 'common', 2, 'gp', 6.0, false, false, ARRAY['general','black_market'], 'PHB', '{"escape_dc":20}'),
('Mess Kit', 'A tin box with a cup and two nested cooking bowls.', '5e', 'misc', 'common', 1, 'gp', 1.0, false, false, ARRAY['general'], 'PHB', null),
('Hourglass', 'Measures exactly 1 hour.', '5e', 'misc', 'common', 25, 'gp', 1.0, false, false, ARRAY['general'], 'PHB', '{"measures":"1 hour"}'),
-- TOOLS
('Smith''s Tools', 'Hammers, tongs, and files for metalworking.', '5e', 'tool', 'common', 20, 'gp', 8.0, false, false, ARRAY['general'], 'PHB', '{"related_skills":["History (metalwork)"],"effect":"Craft and repair metal objects"}'),
('Carpenter''s Tools', 'Saw, hammer, nails, and chisels for woodworking.', '5e', 'tool', 'common', 8, 'gp', 6.0, false, false, ARRAY['general'], 'PHB', '{"related_skills":["History (woodwork)"]}'),
('Leatherworker''s Tools', 'Knife, needles, thread, and dyes for leather.', '5e', 'tool', 'common', 5, 'gp', 5.0, false, false, ARRAY['general'], 'PHB', null),
('Navigator''s Tools', 'Sextant, compass, and charts for navigation.', '5e', 'tool', 'common', 25, 'gp', 2.0, false, false, ARRAY['general'], 'PHB', '{"related_skills":["Survival (navigation)"]}'),
('Disguise Kit', 'Cosmetics, dye, props. Create and apply disguises.', '5e', 'tool', 'common', 25, 'gp', 3.0, false, false, ARRAY['general','black_market'], 'PHB', '{"related_skills":["Deception","Performance"]}'),
-- BLACK MARKET SPECIALTY
('Forgery Kit', 'Inks, papers, and seals. Duplicate handwriting and forge documents.', '5e', 'tool', 'uncommon', 15, 'gp', 5.0, false, false, ARRAY['black_market'], 'PHB', '{"related_skills":["Deception (forgery)"]}'),
('Loaded Dice', 'Weighted dice. You choose the result shown. Illegal in most places.', '5e', 'misc', 'common', 1, 'gp', 0.0, false, false, ARRAY['black_market'], 'PHB', '{"note":"Illegal gambling aid"}'),
('Smuggler''s Satchel', 'Hidden compartments and a false bottom. DC 15 Perception to detect.', '5e', 'misc', 'common', 10, 'gp', 2.0, false, false, ARRAY['black_market'], 'DMG', '{"hidden_compartment_dc":15}'),
('Black Hooded Cloak', 'A long dark cloak. Advantage on Stealth in dim light or darkness.', '5e', 'misc', 'common', 5, 'gp', 2.0, false, false, ARRAY['black_market','general'], 'PHB', '{"effect":"Advantage on Stealth in dim light or darkness"}'),
('Marked Cards', 'A deck with subtle markings visible only to the owner.', '5e', 'misc', 'common', 2, 'gp', 0.0, false, false, ARRAY['black_market'], 'PHB', '{"note":"Illegal gambling aid"}'),
('Gag and Blindfold Set', 'Leather gag and thick blindfold for restraint.', '5e', 'misc', 'common', 3, 'gp', 0.5, false, false, ARRAY['black_market'], 'PHB', null);
