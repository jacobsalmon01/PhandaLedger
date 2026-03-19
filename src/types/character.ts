/** Full D&D 5e character schema — expand as features are added */

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

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface SpellSlot {
  max: number;
  used: number;
}

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
  ac: number;
  initiative: number;
  speed: number;
  hitDice: HitDice;

  saveProficiencies: string[];
  skillProficiencies: string[];

  spellSlots: SpellSlot[];
  weapons: Weapon[];
  inventory: InventoryItem[];
  gold: Gold;
  notes: string;
  portrait: string; // base64 data URL
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
    ac: 10,
    initiative: 0,
    speed: 30,
    hitDice: { type: 'd8', count: 1 },

    saveProficiencies: [],
    skillProficiencies: [],
    spellSlots: [],
    weapons: [],
    inventory: [],
    gold: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    notes: '',
    portrait: '',
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
