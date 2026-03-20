import { useRef, useEffect } from 'react';
import { CONDITIONS, getExhaustionLevel, type ConditionEntry } from '../types/conditions';

interface Props {
  conditions: ConditionEntry[];
  onChange: (next: ConditionEntry[]) => void;
  onClose: () => void;
}

export function ConditionPicker({ conditions, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  const exhaustionLevel = getExhaustionLevel(conditions);
  const exhaustionDef = CONDITIONS.find((c) => c.isExhaustion)!;
  const regularConditions = CONDITIONS.filter((c) => !c.isExhaustion);

  function toggleRegular(name: string) {
    const exists = conditions.some((c) => c.name === name);
    if (exists) onChange(conditions.filter((c) => c.name !== name));
    else         onChange([...conditions, { name }]);
  }

  function setRounds(name: string, rounds: number | undefined) {
    onChange(conditions.map((c) => c.name === name ? { ...c, rounds } : c));
  }

  function toggleExhaustion() {
    const without = conditions.filter((c) => !c.name.startsWith('Exhaustion'));
    if (exhaustionLevel > 0) onChange(without);
    else                     onChange([...without, { name: 'Exhaustion 1' }]);
  }

  function adjustExhaustion(delta: number) {
    const next = Math.max(0, Math.min(6, exhaustionLevel + delta));
    const without = conditions.filter((c) => !c.name.startsWith('Exhaustion'));
    if (next === 0) onChange(without);
    else {
      const existing = conditions.find((c) => c.name.startsWith('Exhaustion'));
      onChange([...without, { name: `Exhaustion ${next}`, rounds: existing?.rounds }]);
    }
  }

  function setExhaustionRounds(rounds: number | undefined) {
    onChange(conditions.map((c) =>
      c.name.startsWith('Exhaustion') ? { ...c, rounds } : c
    ));
  }

  const exhaustionEntry = conditions.find((c) => c.name.startsWith('Exhaustion'));

  return (
    <div className="cond-picker" ref={ref}>
      <div className="cond-picker__header">
        <span className="cond-picker__title">Conditions</span>
        <button className="cond-picker__close" onClick={onClose}>×</button>
      </div>

      <div className="cond-picker__list">
        {regularConditions.map((def) => {
          const entry = conditions.find((c) => c.name === def.name);
          const active = !!entry;
          return (
            <div key={def.name} className={`cond-pick-row${active ? ' cond-pick-row--active' : ''}`}>
              <button
                className="cond-pick-row__btn"
                onClick={() => toggleRegular(def.name)}
                title={def.desc}
              >
                <span className="cond-pick-row__check">{active ? '◆' : '◇'}</span>
                <span className="cond-pick-row__name">{def.name}</span>
              </button>
              {active && (
                <div className="cond-pick-row__rounds">
                  <input
                    type="number"
                    className="cond-rounds-input"
                    min={1}
                    placeholder="∞"
                    value={entry?.rounds ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setRounds(def.name, isNaN(v) || v < 1 ? undefined : v);
                    }}
                  />
                  <span className="cond-rounds-input__label">rnd</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exhaustion — level controls + rounds */}
      <div className="cond-picker__exhaustion">
        <div className={`cond-pick-row${exhaustionLevel > 0 ? ' cond-pick-row--active' : ''}`}>
          <button
            className="cond-pick-row__btn"
            onClick={toggleExhaustion}
            title={exhaustionDef.desc}
          >
            <span className="cond-pick-row__check">{exhaustionLevel > 0 ? '◆' : '◇'}</span>
            <span className="cond-pick-row__name">Exhaustion</span>
            {exhaustionLevel > 0 && (
              <span className="cond-pick-exh-level">{exhaustionLevel}</span>
            )}
          </button>
          {exhaustionLevel > 0 && (
            <div className="cond-pick-row__rounds">
              <input
                type="number"
                className="cond-rounds-input"
                min={1}
                placeholder="∞"
                value={exhaustionEntry?.rounds ?? ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setExhaustionRounds(isNaN(v) || v < 1 ? undefined : v);
                }}
              />
              <span className="cond-rounds-input__label">rnd</span>
            </div>
          )}
        </div>

        {exhaustionLevel > 0 && (
          <div className="cond-exh-controls">
            <button className="cond-exh-ctrl" onClick={() => adjustExhaustion(-1)} disabled={exhaustionLevel <= 1}>−</button>
            <span className="cond-exh-label">Level {exhaustionLevel}</span>
            <button className="cond-exh-ctrl" onClick={() => adjustExhaustion(1)} disabled={exhaustionLevel >= 6}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}
