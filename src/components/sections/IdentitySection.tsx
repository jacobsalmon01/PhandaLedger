import type { Character } from '../../types/character';
import { profBonus } from '../../types/character';
import { NumericInput } from '../NumericInput';
import { DND_CLASSES, getClassDef } from '../../types/classes';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

export function IdentitySection({ ch, updateSelected }: Props) {
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
    </section>
  );
}
