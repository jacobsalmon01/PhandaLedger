export type ConditionTier = 'danger' | 'caution' | 'arcane';

/** A single active condition on a character */
export interface ConditionEntry {
  name: string;     // "Poisoned", "Exhaustion 2", etc.
  rounds?: number;  // undefined = no timer; ≥1 = rounds remaining
}

export interface ConditionDef {
  name: string;
  abbr: string;
  icon: string;
  tier: ConditionTier;
  desc: string;
  isExhaustion?: true;
}

export const CONDITIONS: ConditionDef[] = [
  { name: 'Blinded',       abbr: 'BLN', icon: '⊘', tier: 'caution', desc: 'Auto-fail sight checks. Attacks vs. you have advantage; your attacks have disadvantage.' },
  { name: 'Charmed',       abbr: 'CHM', icon: '♡', tier: 'arcane',  desc: 'Cannot attack charmer. Charmer has advantage on social checks vs. you.' },
  { name: 'Deafened',      abbr: 'DEF', icon: '∅', tier: 'caution', desc: 'Cannot hear. Auto-fail hearing-based Perception checks.' },
  { name: 'Exhaustion',    abbr: 'EXH', icon: '⊖', tier: 'caution', desc: 'Level 1: Disadvantage on checks. 2: Halved speed. 3: Disadvantage on attacks/saves. 4: Halved max HP. 5: Halved speed. 6: Death.', isExhaustion: true },
  { name: 'Frightened',    abbr: 'FRT', icon: '⚠', tier: 'caution', desc: 'Disadvantage on checks/attacks while source is visible. Cannot willingly move closer to source.' },
  { name: 'Grappled',      abbr: 'GRP', icon: '⌁', tier: 'arcane',  desc: 'Speed becomes 0. Ends if grappler is incapacitated or you escape.' },
  { name: 'Incapacitated', abbr: 'INC', icon: '✗', tier: 'danger',  desc: 'Cannot take actions or reactions.' },
  { name: 'Invisible',     abbr: 'INV', icon: '◌', tier: 'arcane',  desc: 'Cannot be seen without magic. Attacks have advantage; attacks vs. you have disadvantage.' },
  { name: 'Paralyzed',     abbr: 'PAR', icon: '‖', tier: 'danger',  desc: 'Incapacitated, immobile. Auto-fail STR/DEX saves. Hits within 5 ft. are critical hits.' },
  { name: 'Petrified',     abbr: 'PTF', icon: '◈', tier: 'danger',  desc: 'Turned to stone. Incapacitated, immobile. Resistance to all damage. Immune to poison/disease.' },
  { name: 'Poisoned',      abbr: 'PSN', icon: '☽', tier: 'caution', desc: 'Disadvantage on attack rolls and ability checks.' },
  { name: 'Prone',         abbr: 'PRN', icon: '↓', tier: 'caution', desc: 'Disadvantage on attacks. Melee attacks vs. you have advantage; ranged have disadvantage.' },
  { name: 'Restrained',    abbr: 'RST', icon: '⊕', tier: 'arcane',  desc: 'Speed 0. Attacks vs. you have advantage; your attacks have disadvantage. Disadvantage on DEX saves.' },
  { name: 'Stunned',       abbr: 'STN', icon: '⊛', tier: 'danger',  desc: 'Incapacitated, immobile. Auto-fail STR/DEX saves. Attacks vs. you have advantage.' },
  { name: 'Unconscious',   abbr: 'UNC', icon: '○', tier: 'danger',  desc: 'Incapacitated, immobile, drops items. Auto-fail STR/DEX saves. Hits within 5 ft. are crits.' },
];

export function getConditionDef(nameOrEntry: string | ConditionEntry): ConditionDef | undefined {
  const name = typeof nameOrEntry === 'string' ? nameOrEntry : nameOrEntry.name;
  const baseName = name.startsWith('Exhaustion') ? 'Exhaustion' : name;
  return CONDITIONS.find((c) => c.name === baseName);
}

export function getExhaustionLevel(conditions: ConditionEntry[]): number {
  const entry = conditions.find((c) => c.name.startsWith('Exhaustion '));
  if (!entry) return 0;
  const level = parseInt(entry.name.split(' ')[1] ?? '1', 10);
  return isNaN(level) ? 1 : Math.max(1, Math.min(6, level));
}
