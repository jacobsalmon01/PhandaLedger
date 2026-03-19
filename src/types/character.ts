/** Full D&D 5e character schema — expand as features are added */

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
  attackBonus: number;
  damageDice: string; // e.g. '1d8'
  damageType: string;
  stat: keyof AbilityScores;
  finesse: boolean;
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

export type RechargeOn = 'short' | 'long' | 'manual';

export interface TrackedResource {
  id: string;
  name: string;
  max: number;
  used: number;
  recharge: RechargeOn;
}

export type ArmorType = 'none' | 'light' | 'medium' | 'heavy';

export interface Gold {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
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
  hitDice: HitDice;

  saveProficiencies: string[];
  skillProficiencies: string[];

  shortRestsUsed: number;          // 0–2, resets on long rest
  lastLongRestAt: string | null;   // display label, e.g. "Fri Mar 19 · 9:00 PM"
  lastLongRestTimestamp: number | null; // ms epoch for 24h cooldown

  spellSlots: SpellSlot[];
  weapons: Weapon[];
  inventory: InventoryItem[];
  gold: Gold;
  resources: TrackedResource[];
  notes: string;
  portrait: string; // base64 data URL
  portraitCrop: PortraitCrop;
}

export function createCharacter(name = ''): Character {
  return {
    id: crypto.randomUUID(),
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
    hitDice: { type: 'd8', count: 1 },

    saveProficiencies: [],
    skillProficiencies: [],

    shortRestsUsed: 0,
    lastLongRestAt: null,
    lastLongRestTimestamp: null,
    spellSlots: [],
    weapons: [],
    inventory: [],
    gold: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    resources: [],
    notes: '',
    portrait: '',
    portraitCrop: { scale: 1, offsetX: 0, offsetY: 0 },
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

/** AC including contributions from equipped item modifiers */
export function calcEffectiveAC(ch: Character): number {
  return applyModifiers(calcAC(ch), ch.inventory, 'ac');
}
