import { useState } from 'react';
import { type Character, abilityMod } from '../types/character';

interface Props {
  characters: Character[];
  onConfirm: (hpGains: Record<string, number>) => void;
  onCancel: () => void;
}

function parseDieSides(type: string): number {
  const n = parseInt(type.replace('d', ''), 10);
  return isNaN(n) || n < 1 ? 8 : n;
}

function rollDie(type: string): number {
  return Math.floor(Math.random() * parseDieSides(type)) + 1;
}

function hpColor(current: number, max: number): string {
  const pct = max > 0 ? current / max : 1;
  if (pct > 0.6) return 'var(--hp-healthy)';
  if (pct > 0.25) return 'var(--hp-wounded)';
  return 'var(--hp-critical)';
}

export function ShortRestModal({ characters, onConfirm, onCancel }: Props) {
  const [hpInputs, setHpInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    characters.forEach((c) => { init[c.id] = ''; });
    return init;
  });
  const [rolling, setRolling] = useState<Record<string, boolean>>({});
  const [rolledInputs, setRolledInputs] = useState<Record<string, boolean>>({});

  function animateRoll(ids: string[]) {
    const r: Record<string, boolean> = {};
    ids.forEach((id) => { r[id] = true; });
    setRolling(r);
    setRolledInputs(r);
    setTimeout(() => setRolling({}), 450);
    setTimeout(() => setRolledInputs({}), 450);
  }

  function rollForCharacter(c: Character) {
    const conMod = abilityMod(c.abilities.con);
    const roll = rollDie(c.hitDice.type);
    const total = Math.max(0, roll + conMod);
    setHpInputs((prev) => ({ ...prev, [c.id]: String(total) }));
    animateRoll([c.id]);
  }

  function rollAll() {
    const next: Record<string, string> = {};
    const ids: string[] = [];
    characters.forEach((c) => {
      if (c.hp.current < c.hp.max) {
        const conMod = abilityMod(c.abilities.con);
        const roll = rollDie(c.hitDice.type);
        next[c.id] = String(Math.max(0, roll + conMod));
        ids.push(c.id);
      }
    });
    setHpInputs((prev) => ({ ...prev, ...next }));
    animateRoll(ids);
  }

  function handleConfirm() {
    const gains: Record<string, number> = {};
    characters.forEach((c) => {
      const val = parseInt(hpInputs[c.id] ?? '', 10);
      gains[c.id] = isNaN(val) ? 0 : Math.max(0, val);
    });
    onConfirm(gains);
  }

  const eligibleCount = characters.filter((c) => c.hp.current < c.hp.max).length;

  return (
    <div className="lr-modal-overlay" onClick={onCancel}>
      <div className="sr-hp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sr-hp-modal__header">
          <div className="sr-hp-modal__title-row">
            <span className="sr-hp-modal__title">Short Rest</span>
            {eligibleCount > 0 && (
              <button className="sr-hp-modal__roll-all" onClick={rollAll}>
                ⚄ Roll All
              </button>
            )}
          </div>
          <span className="sr-hp-modal__subtitle">Spend hit dice to recover HP</span>
        </div>

        <div className="sr-hp-modal__table">
          {characters.map((c) => {
            const conMod = abilityMod(c.abilities.con);
            const conLabel = conMod >= 0 ? `+${conMod}` : String(conMod);
            const isAtMax = c.hp.current >= c.hp.max;

            return (
              <div key={c.id} className={`sr-hp-row${isAtMax ? ' sr-hp-row--full' : ''}`}>
                <div className="sr-hp-row__portrait">
                  {c.portrait ? (
                    <div className="sr-hp-row__portrait-crop">
                      <img
                        src={c.portrait}
                        alt=""
                        className="sr-hp-row__img"
                        style={{
                          transform: `translate(${c.portraitCrop.offsetX * 100}%, ${c.portraitCrop.offsetY * 100}%) scale(${c.portraitCrop.scale})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>
                  ) : (
                    <span className="sr-hp-row__initial">
                      {(c.name || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="sr-hp-row__info">
                  <span className="sr-hp-row__name">{c.name || 'Unnamed'}</span>
                  <span className="sr-hp-row__meta">
                    {c.class || '—'} · {c.hitDice.type} · CON {conLabel}
                  </span>
                </div>

                <div className="sr-hp-row__hp-status">
                  <span
                    className="sr-hp-row__hp-current"
                    style={{ color: hpColor(c.hp.current, c.hp.max) }}
                  >
                    {c.hp.current}
                  </span>
                  <span className="sr-hp-row__hp-sep">/</span>
                  <span className="sr-hp-row__hp-max">{c.hp.max}</span>
                </div>

                {isAtMax ? (
                  <span className="sr-hp-row__full-label">Full HP</span>
                ) : (
                  <>
                    <button
                      className={`sr-hp-row__roll-btn${rolling[c.id] ? ' sr-hp-row__roll-btn--rolling' : ''}`}
                      onClick={() => rollForCharacter(c)}
                      title={`Roll ${c.hitDice.type} + CON (${conLabel})`}
                    >
                      ⚄
                    </button>
                    <input
                      type="number"
                      min="0"
                      className={`sr-hp-row__input${rolledInputs[c.id] ? ' sr-hp-row__input--rolled' : ''}`}
                      value={hpInputs[c.id] ?? ''}
                      placeholder="0"
                      onChange={(e) =>
                        setHpInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="lr-modal__footer">
          <button className="lr-modal__btn lr-modal__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="lr-modal__btn lr-modal__btn--confirm" onClick={handleConfirm}>
            Take Short Rest
          </button>
        </div>
      </div>
    </div>
  );
}
