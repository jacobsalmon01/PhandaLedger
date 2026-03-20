import type { Character, AbilityScores, StatKey } from '../../types/character';
import { abilityMod, profBonus, applyModifiers } from '../../types/character';
import { NumericInput } from '../NumericInput';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const ABILITIES: [keyof AbilityScores, string][] = [
  ['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'],
  ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma'],
];

const SKILLS_BY_ABILITY: Record<keyof AbilityScores, { key: string; label: string }[]> = {
  str: [{ key: 'athletics',      label: 'Athletics' }],
  dex: [
    { key: 'acrobatics',    label: 'Acrobatics' },
    { key: 'sleightOfHand', label: 'Sleight of Hand' },
    { key: 'stealth',       label: 'Stealth' },
  ],
  con: [],
  int: [
    { key: 'arcana',        label: 'Arcana' },
    { key: 'history',       label: 'History' },
    { key: 'investigation', label: 'Investigation' },
    { key: 'nature',        label: 'Nature' },
    { key: 'religion',      label: 'Religion' },
  ],
  wis: [
    { key: 'animalHandling', label: 'Animal Handling' },
    { key: 'insight',        label: 'Insight' },
    { key: 'medicine',       label: 'Medicine' },
    { key: 'perception',     label: 'Perception' },
    { key: 'survival',       label: 'Survival' },
  ],
  cha: [
    { key: 'deception',    label: 'Deception' },
    { key: 'intimidation', label: 'Intimidation' },
    { key: 'performance',  label: 'Performance' },
    { key: 'persuasion',   label: 'Persuasion' },
  ],
};

export function AbilityScoresSection({ ch, updateSelected }: Props) {
  const pb = profBonus(ch.level);

  function toggleSave(key: keyof AbilityScores) {
    updateSelected((c) => ({
      ...c,
      saveProficiencies: c.saveProficiencies.includes(key)
        ? c.saveProficiencies.filter((p) => p !== key)
        : [...c.saveProficiencies, key],
    }));
  }

  function toggleSkill(skillKey: string) {
    updateSelected((c) => ({
      ...c,
      skillProficiencies: c.skillProficiencies.includes(skillKey)
        ? c.skillProficiencies.filter((k) => k !== skillKey)
        : [...c.skillProficiencies, skillKey],
    }));
  }

  return (
    <section className="section">
      <h2 className="section__heading">Attributes &amp; Skills</h2>
      <div className="attr-skills-grid">
        {ABILITIES.map(([abilityKey, label]) => {
          const score = ch.abilities[abilityKey];
          const effectiveScore = applyModifiers(score, ch.inventory, `abilities.${abilityKey}` as StatKey);
          const mod = abilityMod(effectiveScore);
          const isSaveProficient = ch.saveProficiencies.includes(abilityKey);
          const saveBonus = mod + (isSaveProficient ? pb : 0);
          const skills = SKILLS_BY_ABILITY[abilityKey];

          return (
            <div key={abilityKey} className="attr-col">
              {/* Ability score header */}
              <div className={`ability-card${effectiveScore !== score ? ' ability-card--modified' : ''}`}>
                <span className="ability-card__label">{label.slice(0, 3).toUpperCase()}</span>
                <div className="ability-card__row">
                  <NumericInput
                    className={`ability-card__score${effectiveScore !== score ? ' ability-card__score--has-effective' : ''}`}
                    value={score}
                    fallback={10}
                    min={1}
                    max={30}
                    onCommit={(v) => updateSelected((c) => ({
                      ...c,
                      abilities: { ...c.abilities, [abilityKey]: Math.max(1, Math.min(30, v)) },
                    }))}
                  />
                  {effectiveScore !== score && (
                    <span className="ability-card__effective">{effectiveScore}</span>
                  )}
                </div>
                <span className="ability-card__mod">{mod >= 0 ? `+${mod}` : `${mod}`}</span>
              </div>

              {/* Saving throw */}
              <div className="attr-col__divider" />
              <button
                className={`attr-check-row attr-check-row--save${isSaveProficient ? ' attr-check-row--proficient' : ''}`}
                onClick={() => toggleSave(abilityKey)}
                title={`${label} saving throw${isSaveProficient ? ` (proficient, +${pb})` : ' — click to add proficiency'}`}
              >
                <span className="attr-check-row__dot attr-check-row__dot--save" />
                <span className="attr-check-row__name">Save</span>
                <span className="attr-check-row__bonus">
                  {saveBonus >= 0 ? `+${saveBonus}` : `${saveBonus}`}
                </span>
              </button>

              {/* Skills */}
              {skills.length > 0 && <div className="attr-col__divider attr-col__divider--skills" />}
              {skills.map(({ key: skillKey, label: skillLabel }) => {
                const isProficient = ch.skillProficiencies.includes(skillKey);
                const bonus = mod + (isProficient ? pb : 0);
                return (
                  <button
                    key={skillKey}
                    className={`attr-check-row${isProficient ? ' attr-check-row--proficient' : ''}`}
                    onClick={() => toggleSkill(skillKey)}
                    title={`${skillLabel}${isProficient ? ` (proficient, +${pb})` : ' — click to add proficiency'}`}
                  >
                    <span className="attr-check-row__dot" />
                    <span className="attr-check-row__name">{skillLabel}</span>
                    <span className="attr-check-row__bonus">
                      {bonus >= 0 ? `+${bonus}` : `${bonus}`}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
