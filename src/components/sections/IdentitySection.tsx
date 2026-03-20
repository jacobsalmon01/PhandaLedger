import type { Character, FightingStyle } from '../../types/character';
import { profBonus } from '../../types/character';
import { NumericInput } from '../NumericInput';
import { DND_CLASSES, getClassDef } from '../../types/classes';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const FIGHTING_STYLE_DEFS: { key: FightingStyle; label: string; desc: string }[] = [
  { key: 'archery',      label: 'Archery',      desc: '+2 bonus to attack rolls with ranged weapons' },
  { key: 'defense',      label: 'Defense',      desc: '+1 AC while wearing armor' },
  { key: 'dueling',      label: 'Dueling',      desc: '+2 damage wielding one melee weapon in one hand' },
  { key: 'great-weapon', label: 'Great Weapon', desc: 'Reroll 1s & 2s on damage dice for two-handed weapons' },
  { key: 'protection',   label: 'Protection',   desc: 'Reaction: impose disadvantage on attacks near you (shield)' },
  { key: 'two-weapon',   label: 'Two-Weapon',   desc: 'Add ability modifier to your offhand attack\'s damage' },
];

export function IdentitySection({ ch, updateSelected }: Props) {
  const isFighter = ch.class.toLowerCase().includes('fighter');

  function toggleStyle(style: FightingStyle) {
    updateSelected((c) => ({
      ...c,
      fightingStyles: c.fightingStyles.includes(style)
        ? c.fightingStyles.filter((s) => s !== style)
        : [...c.fightingStyles, style],
    }));
  }

  return (
    <section className="section">
      <h2 className="section__heading">Identity</h2>
      <div className="identity-row">
        <div className="field field--grow">
          <label className="field__label">Class</label>
          <select
            className="field__input field__input--select"
            value={ch.class}
            onChange={(e) => {
              const name = e.target.value;
              const def = getClassDef(name);
              updateSelected((c) => ({
                ...c,
                class: name,
                ...(def && {
                  hitDice: { ...c.hitDice, type: def.hitDice },
                  sneakAttack: def.sneakAttack,
                  ...(def.spellcastingAbility && { spellcastingAbility: def.spellcastingAbility }),
                }),
              }));
            }}
          >
            <option value="">— Select class —</option>
            {DND_CLASSES.map((cls) => (
              <option key={cls.name} value={cls.name}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div className="field field--grow">
          <label className="field__label">Subclass</label>
          <input className="field__input" value={ch.subclass} placeholder="Champion" spellCheck={false}
            onChange={(e) => updateSelected((c) => ({ ...c, subclass: e.target.value }))} />
        </div>
        <div className="field field--grow">
          <label className="field__label">Race</label>
          <input className="field__input" value={ch.race} placeholder="Human" spellCheck={false}
            onChange={(e) => updateSelected((c) => ({ ...c, race: e.target.value }))} />
        </div>
        <div className="field field--sm">
          <label className="field__label">Level</label>
          <NumericInput
            className="field__input field__input--number"
            value={ch.level}
            fallback={1}
            min={1}
            max={20}
            onCommit={(v) => updateSelected((c) => ({ ...c, level: Math.max(1, Math.min(20, v)) }))}
          />
        </div>
        <div className="field field--sm">
          <label className="field__label">Prof.</label>
          <div className="field__computed">+{profBonus(ch.level)}</div>
        </div>
        <div className="field field--grow">
          <label className="field__label">Background</label>
          <input className="field__input" value={ch.background} placeholder="Sage" spellCheck={false}
            onChange={(e) => updateSelected((c) => ({ ...c, background: e.target.value }))} />
        </div>
      </div>

      {isFighter && (
        <div className="fighting-styles-section">
          <h3 className="fighting-styles__heading">Fighting Style</h3>
          <div className="fighting-styles__grid">
            {FIGHTING_STYLE_DEFS.map(({ key, label, desc }) => {
              const active = (ch.fightingStyles ?? []).includes(key);
              return (
                <button
                  key={key}
                  className={`fighting-style-card${active ? ' fighting-style-card--active' : ''}`}
                  onClick={() => toggleStyle(key)}
                >
                  <span className="fighting-style-card__check">{active ? '◆' : '◇'}</span>
                  <span className="fighting-style-card__name">{label}</span>
                  <span className="fighting-style-card__desc">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
