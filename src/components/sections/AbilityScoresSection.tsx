import type { Character, AbilityScores } from '../../types/character';
import { abilityMod, profBonus } from '../../types/character';
import { NumericInput } from '../NumericInput';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const ABILITIES: [keyof AbilityScores, string][] = [
  ['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'],
  ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma'],
];

export function AbilityScoresSection({ ch, updateSelected }: Props) {
  const pb = profBonus(ch.level);

  return (
    <section className="section">
      <h2 className="section__heading">Ability Scores</h2>
      <div className="ability-saves-layout">
        <div className="ability-scores">
          {ABILITIES.map(([key, label]) => {
            const score = ch.abilities[key];
            const mod = abilityMod(score);
            return (
              <div key={key} className="ability-card">
                <span className="ability-card__label">{label.slice(0, 3).toUpperCase()}</span>
                <NumericInput
                  className="ability-card__score"
                  value={score}
                  fallback={10}
                  min={1}
                  max={30}
                  onCommit={(v) => updateSelected((c) => ({
                    ...c,
                    abilities: { ...c.abilities, [key]: Math.max(1, Math.min(30, v)) },
                  }))}
                />
                <span className="ability-card__mod">{mod >= 0 ? `+${mod}` : `${mod}`}</span>
              </div>
            );
          })}
        </div>
        <div className="saves-list-col">
          <div className="saves-col-label">Saving Throws</div>
          <div className="saves-list">
            {ABILITIES.map(([key, label]) => {
              const isProficient = ch.saveProficiencies.includes(key);
              const bonus = abilityMod(ch.abilities[key]) + (isProficient ? pb : 0);
              const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
              return (
                <button
                  key={key}
                  className={`save-row${isProficient ? ' save-row--proficient' : ''}`}
                  onClick={() => updateSelected((c) => ({
                    ...c,
                    saveProficiencies: isProficient
                      ? c.saveProficiencies.filter((p) => p !== key)
                      : [...c.saveProficiencies, key],
                  }))}
                  title={`${label} save${isProficient ? ` (proficient, +${pb} prof bonus)` : ' — click to add proficiency'}`}
                >
                  <span className="save-row__indicator" />
                  <span className="save-row__name">{label.slice(0, 3)}</span>
                  <span className="save-row__bonus">{bonusStr}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
