import type { SpellcastingAbility } from './character';

export interface ClassDef {
  name: string;
  hitDice: string;
  spellcastingAbility: SpellcastingAbility | null;
  sneakAttack: boolean;
}

export const DND_CLASSES: ClassDef[] = [
  { name: 'Artificer', hitDice: 'd8',  spellcastingAbility: 'int', sneakAttack: false },
  { name: 'Barbarian', hitDice: 'd12', spellcastingAbility: null,  sneakAttack: false },
  { name: 'Bard',      hitDice: 'd8',  spellcastingAbility: 'cha', sneakAttack: false },
  { name: 'Cleric',    hitDice: 'd8',  spellcastingAbility: 'wis', sneakAttack: false },
  { name: 'Druid',     hitDice: 'd8',  spellcastingAbility: 'wis', sneakAttack: false },
  { name: 'Fighter',   hitDice: 'd10', spellcastingAbility: null,  sneakAttack: false },
  { name: 'Monk',      hitDice: 'd8',  spellcastingAbility: null,  sneakAttack: false },
  { name: 'Paladin',   hitDice: 'd10', spellcastingAbility: 'cha', sneakAttack: false },
  { name: 'Ranger',    hitDice: 'd10', spellcastingAbility: 'wis', sneakAttack: false },
  { name: 'Rogue',     hitDice: 'd8',  spellcastingAbility: null,  sneakAttack: true  },
  { name: 'Sorcerer',  hitDice: 'd6',  spellcastingAbility: 'cha', sneakAttack: false },
  { name: 'Warlock',   hitDice: 'd8',  spellcastingAbility: 'cha', sneakAttack: false },
  { name: 'Wizard',    hitDice: 'd6',  spellcastingAbility: 'int', sneakAttack: false },
];

export function getClassDef(name: string): ClassDef | undefined {
  return DND_CLASSES.find((c) => c.name === name);
}
