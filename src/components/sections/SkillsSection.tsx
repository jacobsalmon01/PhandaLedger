import type { Character, AbilityScores } from '../../types/character';
import { abilityMod, profBonus, skillProficiencyMultiplier } from '../../types/character';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

interface SkillDef {
  key: string;
  label: string;
  ability: keyof AbilityScores;
  abilityAbbr: string;
}

const SKILLS: SkillDef[] = [
  { key: 'acrobatics',     label: 'Acrobatics',     ability: 'dex', abilityAbbr: 'DEX' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wis', abilityAbbr: 'WIS' },
  { key: 'arcana',         label: 'Arcana',          ability: 'int', abilityAbbr: 'INT' },
  { key: 'athletics',      label: 'Athletics',       ability: 'str', abilityAbbr: 'STR' },
  { key: 'deception',      label: 'Deception',       ability: 'cha', abilityAbbr: 'CHA' },
  { key: 'history',        label: 'History',         ability: 'int', abilityAbbr: 'INT' },
  { key: 'insight',        label: 'Insight',         ability: 'wis', abilityAbbr: 'WIS' },
  { key: 'intimidation',   label: 'Intimidation',    ability: 'cha', abilityAbbr: 'CHA' },
  { key: 'investigation',  label: 'Investigation',   ability: 'int', abilityAbbr: 'INT' },
  { key: 'medicine',       label: 'Medicine',        ability: 'wis', abilityAbbr: 'WIS' },
  { key: 'nature',         label: 'Nature',          ability: 'int', abilityAbbr: 'INT' },
  { key: 'perception',     label: 'Perception',      ability: 'wis', abilityAbbr: 'WIS' },
  { key: 'performance',    label: 'Performance',     ability: 'cha', abilityAbbr: 'CHA' },
  { key: 'persuasion',     label: 'Persuasion',      ability: 'cha', abilityAbbr: 'CHA' },
  { key: 'religion',       label: 'Religion',        ability: 'int', abilityAbbr: 'INT' },
  { key: 'sleightOfHand',  label: 'Sleight of Hand', ability: 'dex', abilityAbbr: 'DEX' },
  { key: 'stealth',        label: 'Stealth',         ability: 'dex', abilityAbbr: 'DEX' },
  { key: 'survival',       label: 'Survival',        ability: 'wis', abilityAbbr: 'WIS' },
];

const COL_A = SKILLS.slice(0, 9);
const COL_B = SKILLS.slice(9);

export function SkillsSection({ ch, updateSelected }: Props) {
  const pb = profBonus(ch.level);

  function toggle(key: string) {
    updateSelected((c) => ({
      ...c,
      ...(() => {
        const multiplier = skillProficiencyMultiplier(c, key);
        if (multiplier === 0) {
          return {
            skillProficiencies: [...c.skillProficiencies, key],
            skillExpertise: c.skillExpertise.filter((k) => k !== key),
          };
        }
        if (multiplier === 1) {
          return {
            skillProficiencies: c.skillProficiencies.includes(key) ? c.skillProficiencies : [...c.skillProficiencies, key],
            skillExpertise: [...c.skillExpertise.filter((k) => k !== key), key],
          };
        }
        return {
          skillProficiencies: c.skillProficiencies.filter((k) => k !== key),
          skillExpertise: c.skillExpertise.filter((k) => k !== key),
        };
      })(),
    }));
  }

  function renderSkill(skill: SkillDef) {
    const multiplier = skillProficiencyMultiplier(ch, skill.key);
    const isProficient = multiplier > 0;
    const isExpertise = multiplier === 2;
    const bonus = abilityMod(ch.abilities[skill.ability]) + pb * multiplier;
    const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
    return (
      <button
        key={skill.key}
        className={`skill-row${isProficient ? ' skill-row--proficient' : ''}${isExpertise ? ' skill-row--expertise' : ''}`}
        onClick={() => toggle(skill.key)}
        title={`${skill.label} (${skill.abilityAbbr})${isExpertise ? ` — expertise (+${pb * 2})` : isProficient ? ` — proficient (+${pb})` : ' — click to add proficiency'}`}
      >
        <span className="skill-row__indicator" />
        <span className="skill-row__name">{skill.label}</span>
        <span className="skill-row__ability">{skill.abilityAbbr}</span>
        {isExpertise && <span className="skill-row__expertise">x2</span>}
        <span className="skill-row__bonus">{bonusStr}</span>
      </button>
    );
  }

  return (
    <section className="section">
      <h2 className="section__heading">Skills</h2>
      <div className="skills-grid">
        <div className="skills-col">{COL_A.map(renderSkill)}</div>
        <div className="skills-col">{COL_B.map(renderSkill)}</div>
      </div>
    </section>
  );
}
