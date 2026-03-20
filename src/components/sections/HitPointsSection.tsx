import { useRef, useState } from 'react';
import type { Character, PreparedSpell } from '../../types/character';
import { NumericInput } from '../NumericInput';
import { ConcentrationCheckModal } from '../ConcentrationCheckModal';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

interface ConcCheck {
  spell: PreparedSpell;
  damage: number;
}

export function HitPointsSection({ ch, updateSelected }: Props) {
  const [customAmount, setCustomAmount] = useState('');
  const [concCheck, setConcCheck] = useState<ConcCheck | null>(null);
  const currentHpRef = useRef<HTMLInputElement>(null);

  const pct = ch.hp.max > 0 ? Math.max(0, Math.min(100, (ch.hp.current / ch.hp.max) * 100)) : 0;
  const barColor =
    pct > 60 ? 'var(--hp-healthy)' : pct > 25 ? 'var(--hp-wounded)' : 'var(--hp-critical)';

  const activeConc = ch.spells.find((s) => s.concentration && s.active) ?? null;

  function applyHP(amount: number) {
    updateSelected((c) => {
      if (amount < 0) {
        let dmg = Math.abs(amount);
        if (c.hp.temp > 0) {
          const absorbed = Math.min(c.hp.temp, dmg);
          c.hp.temp -= absorbed;
          dmg -= absorbed;
        }
        c.hp.current = Math.max(0, c.hp.current - dmg);
      } else {
        c.hp.current = Math.min(c.hp.current + amount, c.hp.max);
      }
      return c;
    });

    // Trigger concentration check if taking damage while concentrating
    if (amount < 0 && activeConc) {
      setConcCheck({ spell: activeConc, damage: Math.abs(amount) });
    }

    const el = currentHpRef.current;
    if (el) {
      const cls = amount < 0 ? 'hp-flash-dmg' : 'hp-flash-heal';
      el.classList.remove('hp-flash-dmg', 'hp-flash-heal');
      void el.offsetWidth;
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 350);
    }
  }

  function breakConcentration() {
    if (!concCheck) return;
    updateSelected((c) => ({
      ...c,
      spells: c.spells.map((s) =>
        s.id === concCheck.spell.id ? { ...s, active: false, roundsRemaining: 0 } : s
      ),
    }));
    setConcCheck(null);
  }

  function keepConcentration() {
    setConcCheck(null);
  }

  function handleCustomHP(sign: 1 | -1) {
    const val = parseInt(customAmount, 10);
    if (!val || val <= 0) return;
    applyHP(val * sign);
    setCustomAmount('');
  }

  return (
    <section className="section">
      <h2 className="section__heading">Hit Points</h2>
      <div className="hp-block">
        <div className="hp-display">
          <span className="hp-display__label">Current</span>
          <NumericInput
            ref={currentHpRef}
            className="hp-display__value hp-display__value--current"
            value={ch.hp.current}
            fallback={0}
            style={{ color: barColor, borderColor: barColor + '40' }}
            onCommit={(v) => updateSelected((c) => ({ ...c, hp: { ...c.hp, current: Math.max(0, v) } }))}
          />
        </div>
        <div className="hp-separator">/</div>
        <div className="hp-display">
          <span className="hp-display__label">Maximum</span>
          <NumericInput
            className="hp-display__value"
            value={ch.hp.max}
            fallback={1}
            min={1}
            onCommit={(v) => updateSelected((c) => ({ ...c, hp: { ...c.hp, max: Math.max(1, v) } }))}
          />
        </div>
        <div className="hp-display">
          <span className="hp-display__label">Temp HP</span>
          <NumericInput
            className="hp-display__value hp-display__value--temp"
            value={ch.hp.temp}
            fallback={0}
            min={0}
            onCommit={(v) => updateSelected((c) => ({ ...c, hp: { ...c.hp, temp: Math.max(0, v) } }))}
          />
        </div>
        <div className="hp-bar-container">
          <div className="hp-bar">
            <div
              className="hp-bar__fill"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
          <div className="hp-bar__text">
            {ch.hp.current} / {ch.hp.max} HP
            {ch.hp.temp > 0 && ` (+${ch.hp.temp} temp)`}
          </div>
        </div>
      </div>

      <div className="hp-quick-btns">
        <span className="hp-quick-btns__label">Quick</span>
        {[-1, -5, -10].map((n) => (
          <button key={n} className="hp-quick-btn hp-quick-btn--dmg" onClick={() => applyHP(n)}>
            {n}
          </button>
        ))}
        {[1, 5, 10].map((n) => (
          <button key={n} className="hp-quick-btn hp-quick-btn--heal" onClick={() => applyHP(n)}>
            +{n}
          </button>
        ))}
        <div className="hp-custom">
          <input
            type="number"
            className="hp-custom__input"
            placeholder="N"
            min={0}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomHP(-1);
            }}
          />
          <button className="hp-custom__btn hp-custom__btn--heal" onClick={() => handleCustomHP(1)}>
            Heal
          </button>
          <button className="hp-custom__btn hp-custom__btn--dmg" onClick={() => handleCustomHP(-1)}>
            Dmg
          </button>
        </div>
      </div>

      {concCheck && (
        <ConcentrationCheckModal
          ch={ch}
          spell={concCheck.spell}
          damage={concCheck.damage}
          onBreak={breakConcentration}
          onKeep={keepConcentration}
        />
      )}
    </section>
  );
}
