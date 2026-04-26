import type { Character, AbilityScores } from '../../types/character';
import { abilityMod, profBonus, skillProficiencyMultiplier } from '../../types/character';

interface Props {
  ch: Character;
}

const ABILITIES: [keyof AbilityScores, string, string][] = [
  ['str', 'STR', 'Strength'],
  ['dex', 'DEX', 'Dexterity'],
  ['con', 'CON', 'Constitution'],
  ['int', 'INT', 'Intelligence'],
  ['wis', 'WIS', 'Wisdom'],
  ['cha', 'CHA', 'Charisma'],
];

const SKILLS_BY_ABILITY: Record<keyof AbilityScores, { key: string; label: string }[]> = {
  str: [{ key: 'athletics', label: 'Athletics' }],
  dex: [
    { key: 'acrobatics', label: 'Acrobatics' },
    { key: 'sleightOfHand', label: 'Sleight of Hand' },
    { key: 'stealth', label: 'Stealth' },
  ],
  con: [],
  int: [
    { key: 'arcana', label: 'Arcana' },
    { key: 'history', label: 'History' },
    { key: 'investigation', label: 'Investigation' },
    { key: 'nature', label: 'Nature' },
    { key: 'religion', label: 'Religion' },
  ],
  wis: [
    { key: 'animalHandling', label: 'Animal Handling' },
    { key: 'insight', label: 'Insight' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'perception', label: 'Perception' },
    { key: 'survival', label: 'Survival' },
  ],
  cha: [
    { key: 'deception', label: 'Deception' },
    { key: 'intimidation', label: 'Intimidation' },
    { key: 'performance', label: 'Performance' },
    { key: 'persuasion', label: 'Persuasion' },
  ],
};

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function AbilitiesCard({ ch }: Props) {
  const pb = profBonus(ch.level);

  return (
    <div className="pv-card pv-card--abilities">
      <h2 className="pv-card__title">Abilities</h2>
      <div className="pv-abilities__grid">
        {ABILITIES.map(([key, abbr]) => {
          const score = ch.abilities[key];
          const mod = abilityMod(score);
          const hasSave = ch.saveProficiencies.includes(key);
          const saveBonus = mod + (hasSave ? pb : 0);
          const skills = SKILLS_BY_ABILITY[key];

          return (
            <div key={key} className="pv-ability">
              <div className="pv-ability__header">
                <span className="pv-ability__abbr">{abbr}</span>
                <span className="pv-ability__score">{score}</span>
              </div>
              <div className="pv-ability__mod">{signed(mod)}</div>
              <div className={`pv-ability__save${hasSave ? ' pv-ability__save--prof' : ''}`}>
                Save {signed(saveBonus)}
              </div>
              {skills.length > 0 && (
                <div className="pv-ability__skills">
                  {skills.map((sk) => {
                    const multiplier = skillProficiencyMultiplier(ch, sk.key);
                    const isProf = multiplier > 0;
                    const isExpertise = multiplier === 2;
                    const bonus = mod + pb * multiplier;
                    return (
                      <div key={sk.key} className={`pv-skill${isProf ? ' pv-skill--prof' : ''}${isExpertise ? ' pv-skill--expertise' : ''}`}>
                        <span className="pv-skill__dot">{isExpertise ? 'x2' : isProf ? '\u25cf' : '\u25cb'}</span>
                        <span className="pv-skill__name">{sk.label}</span>
                        <span className="pv-skill__bonus">{signed(bonus)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
