/** Full D&D 5e character schema — expand as features are added */
import type { ConditionEntry } from './conditions';
import { uuid } from '../utils/uuid';

export interface PortraitCrop {
  scale: number;
  offsetX: number; // fraction of container width (-1 to 1)
  offsetY: number; // fraction of container height (-1 to 1)
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface HitPoints {
  current: number;
  max: number;
  temp: number;
}

export interface HitDice {
  type: string; // e.g. 'd8'
  count: number;
}

export interface Weapon {
  id: string;
  name: string;
  attackBonus: number;   // magic enhancement — applies to both attack and damage
  damageDice: string;    // one-handed damage dice, e.g. '1d8'
  versatile: boolean;    // can be used one- or two-handed
  versatileDice: string; // two-handed damage dice, e.g. '1d10'
  twoHanded: boolean;    // inherently two-handed (e.g. greatsword) — used for GWF
  damageType: string;
  stat: keyof AbilityScores;
  finesse: boolean;      // may use STR or DEX, whichever is higher
  ranged: boolean;       // ranged weapon — qualifies for sneak attack
  proficient: boolean;
}

export type StatKey =
  | 'ac'
  | 'speed'
  | 'initiative'
  | 'hp.max'
  | 'abilities.str'
  | 'abilities.dex'
  | 'abilities.con'
  | 'abilities.int'
  | 'abilities.wis'
  | 'abilities.cha';

export interface StatModifier {
  stat: StatKey;
  op: 'add' | 'mul' | 'set';
  value: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description: string; // shown in hover tooltip / edit panel
  valuegp: number;     // value in gold pieces; 0 means unset
  equipped: boolean;
  modifiers: StatModifier[];
}

export interface SpellSlot {
  max: number;
  used: number;
}

export interface PreparedSpell {
  id: string;
  name: string;
  level: number;           // 0 = cantrip, 1–9 = leveled
  concentration: boolean;
  duration: string;        // display string, e.g. "Concentration, up to 1 minute"
  durationRounds: number;  // 0 = not round-trackable
  castingTime: string;     // "1 action", "Bonus action", etc.
  notes: string;           // quick reference: save DC, damage, etc.
  description: string;     // full spell description (HTML); populated from compendium
  prepared: boolean;       // prepared for the day — only prepared spells can be cast
  alwaysPrepared: boolean; // granted by class/subclass — always prepared, doesn't count against limit
  fromItem: boolean;       // provided by a magic item — doesn't count against prepared limit
  itemChargesEmpty: boolean; // item is out of charges — spell cannot be cast
  // runtime tracking — persisted so a refresh mid-session keeps state
  active: boolean;
  roundsRemaining: number;
}

export type FightingStyle = 'archery' | 'defense' | 'dueling' | 'great-weapon' | 'protection' | 'two-weapon';

export type RechargeOn = 'short' | 'long' | 'manual';

export interface TrackedResource {
  id: string;
  name: string;
  description: string;
  max: number;
  used: number;
  recharge: RechargeOn;
}

export type ArmorType = 'none' | 'light' | 'medium' | 'heavy';

export type SpellcastingAbility = 'int' | 'wis' | 'cha';

export interface Gold {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface DeathSaves {
  successes: number; // 0–3
  failures: number;  // 0–3
}

export interface Character {
  id: string;
  name: string;
  class: string;
  subclass: string;
  race: string;
  level: number;
  background: string;

  abilities: AbilityScores;
  hp: HitPoints;
  armorType: ArmorType;
  armorBaseAC: number;
  shield: boolean;
  shieldBonus: number;
  initiative: number;
  speed: number;
  darkvision: number; // feet (0 = none, 60 = elf/dwarf, 120 = drow)
  hitDice: HitDice;

  saveProficiencies: string[];
  skillProficiencies: string[];
  skillExpertise: string[];

  shortRestsUsed: number;          // 0–2, resets on long rest
  lastLongRestAt: string | null;   // display label, e.g. "Fri Mar 19 · 9:00 PM"
  lastLongRestTimestamp: number | null; // ms epoch for 24h cooldown

  spellcastingAbility: SpellcastingAbility;
  conditions: ConditionEntry[];  // active conditions e.g. [{ name: "Poisoned", rounds: 3 }]
  fightingStyles: FightingStyle[];  // fighter class feature
  sneakAttack: boolean;  // rogue sneak attack — shown on finesse/ranged weapons
  spellSlots: SpellSlot[];
  spells: PreparedSpell[];
  weapons: Weapon[];
  inventory: InventoryItem[];
  gold: Gold;
  resources: TrackedResource[];
  notes: string;
  portrait: string; // base64 data URL
  portraitCrop: PortraitCrop;
  deathSaves: DeathSaves;
  dead: boolean;
}

export function createCharacter(name = ''): Character {
  return {
    id: uuid(),
    name,
    class: '',
    subclass: '',
    race: '',
    level: 1,
    background: '',

    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    hp: { current: 10, max: 10, temp: 0 },
    armorType: 'none',
    armorBaseAC: 0,
    shield: false,
    shieldBonus: 2,
    initiative: 0,
    speed: 30,
    darkvision: 0,
    hitDice: { type: 'd8', count: 1 },

    saveProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],

    shortRestsUsed: 0,
    lastLongRestAt: null,
    lastLongRestTimestamp: null,
    spellcastingAbility: 'int',
    conditions: [],
    fightingStyles: [],
    sneakAttack: false,
    spellSlots: [],
    spells: [],
    weapons: [],
    inventory: [],
    gold: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    resources: [],
    notes: '',
    portrait: '',
    portraitCrop: { scale: 1, offsetX: 0, offsetY: 0 },
    deathSaves: { successes: 0, failures: 0 },
    dead: false,
  };
}

/** Ability modifier from score */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Proficiency bonus from level */
export function profBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

function uniqueStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === 'string'))];
}

/** Normalize skill proficiency/expertise data after loading older saves. */
export function normalizeSkillTraining(ch: Character): Character {
  const skillProficiencies = uniqueStringArray((ch as { skillProficiencies?: unknown }).skillProficiencies);
  const skillExpertise = uniqueStringArray((ch as { skillExpertise?: unknown }).skillExpertise);
  ch.skillExpertise = skillExpertise;
  ch.skillProficiencies = [...new Set([...skillProficiencies, ...skillExpertise])];
  return ch;
}

/** Skill proficiency multiplier: 0 none, 1 proficient, 2 expertise. */
export function skillProficiencyMultiplier(
  ch: Pick<Character, 'skillProficiencies' | 'skillExpertise'>,
  skillKey: string,
): 0 | 1 | 2 {
  if (ch.skillExpertise?.includes(skillKey)) return 2;
  return ch.skillProficiencies.includes(skillKey) ? 1 : 0;
}

/** Skill bonus: ability modifier + proficiency bonus multiplied by training. */
export function skillBonus(
  ch: Pick<Character, 'abilities' | 'level' | 'skillProficiencies' | 'skillExpertise'>,
  skillKey: string,
  ability: keyof AbilityScores,
): number {
  return abilityMod(ch.abilities[ability]) + profBonus(ch.level) * skillProficiencyMultiplier(ch, skillKey);
}

/** Passive Perception: 10 + Perception bonus, including Expertise. */
export function passivePerception(
  ch: Pick<Character, 'abilities' | 'level' | 'skillProficiencies' | 'skillExpertise'>,
): number {
  return 10 + skillBonus(ch, 'perception', 'wis');
}

/** Compute base AC from armor type, base AC, and DEX modifier (no item modifiers) */
export function calcAC(ch: Pick<Character, 'armorType' | 'armorBaseAC' | 'shield' | 'shieldBonus' | 'abilities'>): number {
  const dex = abilityMod(ch.abilities.dex);
  const shieldAC = ch.shield ? ch.shieldBonus : 0;
  switch (ch.armorType) {
    case 'heavy':  return ch.armorBaseAC + shieldAC;
    case 'medium': return ch.armorBaseAC + Math.min(dex, 2) + shieldAC;
    case 'light':  return ch.armorBaseAC + dex + shieldAC;
    case 'none':   return 10 + dex + shieldAC;
  }
}

/** Apply item modifiers for a given stat to a base value */
export function applyModifiers(base: number, items: InventoryItem[], stat: StatKey): number {
  return items
    .filter((i) => i.equipped)
    .flatMap((i) => i.modifiers)
    .filter((m) => m.stat === stat)
    .reduce((acc, m) => {
      switch (m.op) {
        case 'add': return acc + m.value;
        case 'mul': return Math.round(acc * m.value);
        case 'set': return m.value;
      }
    }, base);
}

/** AC including contributions from equipped item modifiers and fighting style */
export function calcEffectiveAC(ch: Character): number {
  const base = applyModifiers(calcAC(ch), ch.inventory, 'ac');
  const defenseBonus = ch.fightingStyles?.includes('defense') && ch.armorType !== 'none' ? 1 : 0;
  return base + defenseBonus;
}

/** Spell attack bonus: spellcasting ability modifier + proficiency bonus */
export function spellAttackBonus(ch: Pick<Character, 'abilities' | 'level' | 'spellcastingAbility'>): number {
  return abilityMod(ch.abilities[ch.spellcastingAbility]) + profBonus(ch.level);
}

/** Spell save DC: 8 + spellcasting ability modifier + proficiency bonus */
export function spellSaveDC(ch: Pick<Character, 'abilities' | 'level' | 'spellcastingAbility'>): number {
  return 8 + spellAttackBonus(ch);
}
