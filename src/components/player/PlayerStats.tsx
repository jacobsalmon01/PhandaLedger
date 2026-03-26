import type { Character } from '../../types/character';
import { abilityMod, profBonus, applyModifiers } from '../../types/character';
import type { StatKey } from '../../types/character';

interface Props {
  ch: Character;
}

const ABILITIES: { key: keyof Character['abilities']; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

const SKILLS: { name: string; ability: keyof Character['abilities']; key: string }[] = [
  { name: 'Acrobatics', ability: 'dex', key: 'acrobatics' },
  { name: 'Animal Handling', ability: 'wis', key: 'animal-handling' },
  { name: 'Arcana', ability: 'int', key: 'arcana' },
  { name: 'Athletics', ability: 'str', key: 'athletics' },
  { name: 'Deception', ability: 'cha', key: 'deception' },
  { name: 'History', ability: 'int', key: 'history' },
  { name: 'Insight', ability: 'wis', key: 'insight' },
  { name: 'Intimidation', ability: 'cha', key: 'intimidation' },
  { name: 'Investigation', ability: 'int', key: 'investigation' },
  { name: 'Medicine', ability: 'wis', key: 'medicine' },
  { name: 'Nature', ability: 'int', key: 'nature' },
  { name: 'Perception', ability: 'wis', key: 'perception' },
  { name: 'Performance', ability: 'cha', key: 'performance' },
  { name: 'Persuasion', ability: 'cha', key: 'persuasion' },
  { name: 'Religion', ability: 'int', key: 'religion' },
  { name: 'Sleight of Hand', ability: 'dex', key: 'sleight-of-hand' },
  { name: 'Stealth', ability: 'dex', key: 'stealth' },
  { name: 'Survival', ability: 'wis', key: 'survival' },
];

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function PlayerStats({ ch }: Props) {
  const prof = profBonus(ch.level);

  function effectiveScore(key: keyof Character['abilities']): number {
    const statKey: StatKey = `abilities.${key}`;
    return applyModifiers(ch.abilities[key], ch.inventory, statKey);
  }

  return (
    <>
      <div className="pv-section-title">
        <span className="pv-section-title__icon">&#9830;</span>
        Abilities
      </div>

      <div className="pv-prof-bonus">
        Proficiency Bonus: <span className="pv-prof-bonus__value">{signed(prof)}</span>
      </div>

      <div className="pv-abilities">
        {ABILITIES.map(({ key, label }) => {
          const score = effectiveScore(key);
          const mod = abilityMod(score);
          const hasSaveProf = ch.saveProficiencies.includes(key);
          const saveBonus = mod + (hasSaveProf ? prof : 0);

          return (
            <div
              key={key}
              className={`pv-ability${hasSaveProf ? ' pv-ability--save-prof' : ''}`}
            >
              <span className="pv-ability__name">{label}</span>
              <span className="pv-ability__score">{score}</span>
              <span className="pv-ability__mod">{signed(mod)}</span>
              <span className="pv-ability__save">
                {hasSaveProf && <span className="pv-ability__save-icon">&#9733;</span>}
                Save {signed(saveBonus)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pv-divider" />

      <div className="pv-section-title">
        <span className="pv-section-title__icon">&#9998;</span>
        Skills
      </div>

      <div className="pv-skills">
        {SKILLS.map((skill) => {
          const score = effectiveScore(skill.ability);
          const mod = abilityMod(score);
          const isProf = ch.skillProficiencies.includes(skill.key);
          const bonus = mod + (isProf ? prof : 0);

          return (
            <div key={skill.key} className="pv-skill">
              <span className={`pv-skill__dot${isProf ? ' pv-skill__dot--prof' : ''}`} />
              <span className="pv-skill__name">{skill.name}</span>
              <span className="pv-skill__bonus">{signed(bonus)}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
