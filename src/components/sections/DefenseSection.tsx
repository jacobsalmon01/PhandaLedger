import type { Character, ArmorType } from '../../types/character';
import { abilityMod, calcEffectiveAC } from '../../types/character';
import { NumericInput } from '../NumericInput';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

export function DefenseSection({ ch, updateSelected }: Props) {
  const itemACMods = ch.inventory
    .filter((i) => i.equipped)
    .flatMap((i) => i.modifiers.filter((m) => m.stat === 'ac').map((m) => ({ m, item: i })));

  return (
    <section className="section">
      <h2 className="section__heading">Defense</h2>
      <div className="defense-row">
        <div className="armor-type-btns">
          {(['none', 'light', 'medium', 'heavy'] as ArmorType[]).map((type) => (
            <button
              key={type}
              className={`armor-type-btn${ch.armorType === type ? ' armor-type-btn--active' : ''}`}
              onClick={() => updateSelected((c) => ({ ...c, armorType: type }))}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        {ch.armorType !== 'none' && (
          <div className="defense-base-ac">
            <label className="field__label">Base AC</label>
            <NumericInput
              className="field__input field__input--number defense-base-ac__input"
              value={ch.armorBaseAC}
              fallback={10}
              min={1}
              max={30}
              onCommit={(v) => updateSelected((c) => ({ ...c, armorBaseAC: Math.max(1, Math.min(30, v)) }))}
            />
          </div>
        )}
        <div className="shield-toggle">
          <button
            className={`shield-btn${ch.shield ? ' shield-btn--active' : ''}`}
            onClick={() => updateSelected((c) => ({ ...c, shield: !c.shield }))}
            title="Toggle shield"
          >
            Shield
          </button>
          {ch.shield && (
            <NumericInput
              className="field__input field__input--number shield-bonus-input"
              value={ch.shieldBonus}
              fallback={2}
              min={1}
              max={10}
              onCommit={(v) => updateSelected((c) => ({ ...c, shieldBonus: Math.max(1, Math.min(10, v)) }))}
            />
          )}
        </div>
        <div className="defense-formula">
          <div className="defense-formula__hero">
            <span className="defense-formula__total">{calcEffectiveAC(ch)}</span>
            <span className="defense-formula__ac-label">AC</span>
          </div>
          <div className="defense-formula__breakdown">
            {ch.armorType === 'none' && (
              <span className="defense-formula__text">10+{abilityMod(ch.abilities.dex)} dex</span>
            )}
            {ch.armorType === 'medium' && (
              <span className="defense-formula__text">{ch.armorBaseAC}+{Math.min(abilityMod(ch.abilities.dex), 2)} dex</span>
            )}
            {ch.armorType === 'light' && (
              <span className="defense-formula__text">{ch.armorBaseAC}+{abilityMod(ch.abilities.dex)} dex</span>
            )}
            {ch.shield && (
              <span className="defense-formula__text">+{ch.shieldBonus} shield</span>
            )}
            {itemACMods.map(({ m, item }, idx) => (
              <span key={idx} className="defense-formula__text defense-formula__text--item" title={item.name}>
                {m.op === 'add' ? (m.value >= 0 ? `+${m.value}` : `−${Math.abs(m.value)}`)
                 : m.op === 'mul' ? `×${m.value}`
                 : `=${m.value}`} {item.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
