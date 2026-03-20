import { useState, useRef, useCallback } from 'react';
import type { Character, PreparedSpell } from '../types/character';
import { abilityMod, profBonus } from '../types/character';

type Phase = 'choose' | 'rolling' | 'landing' | 'result';

interface Props {
  ch: Character;
  spell: PreparedSpell;
  damage: number;
  onBreak: () => void;
  onKeep: () => void;
}

function rollDie(faces: number): number {
  return Math.floor(Math.random() * faces) + 1;
}

export function ConcentrationCheckModal({ ch, spell, damage, onBreak, onKeep }: Props) {
  const dc = Math.max(10, Math.floor(damage / 2));
  const conMod = abilityMod(ch.abilities.con);
  const isProficient = ch.saveProficiencies.includes('con');
  const saveBonus = conMod + (isProficient ? profBonus(ch.level) : 0);
  const bonusStr = saveBonus >= 0 ? `+${saveBonus}` : `${saveBonus}`;

  const [phase, setPhase] = useState<Phase>('choose');
  const [animNum, setAnimNum] = useState(1);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  const handleRoll = useCallback(() => {
    clearTimer();
    setPhase('rolling');
    setRollResult(null);
    setTotal(null);

    const finalRoll = rollDie(20);
    const finalTotal = finalRoll + saveBonus;
    let delay = 35;
    let step = 0;

    function tick() {
      step++;
      if (step >= 14) {
        setAnimNum(finalRoll);
        setPhase('landing');
        timerRef.current = setTimeout(() => {
          setRollResult(finalRoll);
          setTotal(finalTotal);
          setPhase('result');
        }, 500);
        return;
      }
      setAnimNum(rollDie(20));
      delay = Math.min(delay * 1.28, 130);
      timerRef.current = setTimeout(tick, delay);
    }
    tick();
  }, [saveBonus]);

  const passed = total !== null && total >= dc;
  const isNat20 = rollResult === 20;
  const isNat1 = rollResult === 1;

  return (
    <div className="conc-modal-overlay" onClick={(e) => e.target === e.currentTarget && phase === 'choose' && onKeep()}>
      <div className={[
        'conc-modal',
        phase === 'result' && passed ? 'conc-modal--pass' : '',
        phase === 'result' && !passed ? 'conc-modal--fail' : '',
      ].filter(Boolean).join(' ')}>

        {/* Header */}
        <div className="conc-modal__header">
          <span className="conc-modal__icon">◎</span>
          <div className="conc-modal__header-text">
            <span className="conc-modal__title">Concentration Check</span>
            <span className="conc-modal__subtitle">{ch.name || 'Character'} took damage while maintaining concentration on a spell. A Constitution saving throw is required to maintain it.</span>
          </div>
        </div>

        {/* Context */}
        <div className="conc-modal__context">
          <div className="conc-modal__spell-name">{spell.name}</div>
          <div className="conc-modal__damage-line">
            <span className="conc-modal__dmg-value">{damage}</span>
            <span className="conc-modal__dmg-label">damage taken</span>
          </div>
        </div>

        {/* DC display */}
        <div className="conc-modal__dc-row">
          <span className="conc-modal__dc-label">DC</span>
          <span className="conc-modal__dc-value">{dc}</span>
          <span className="conc-modal__dc-formula">
            (max of 10 or {Math.floor(damage / 2)})
          </span>
        </div>

        {/* Choose phase */}
        {phase === 'choose' && (
          <div className="conc-modal__actions">
            <button className="conc-modal__btn conc-modal__btn--break" onClick={onBreak}>
              <span className="conc-modal__btn-icon">✕</span>
              <span className="conc-modal__btn-text">Break</span>
              <span className="conc-modal__btn-sub">End concentration</span>
            </button>
            <button className="conc-modal__btn conc-modal__btn--roll" onClick={handleRoll}>
              <span className="conc-modal__btn-icon">⚄</span>
              <span className="conc-modal__btn-text">Roll CON Save</span>
              <span className="conc-modal__btn-sub">{bonusStr} modifier</span>
            </button>
            <button className="conc-modal__btn conc-modal__btn--keep" onClick={onKeep}>
              <span className="conc-modal__btn-icon">✓</span>
              <span className="conc-modal__btn-text">Keep</span>
              <span className="conc-modal__btn-sub">DM override</span>
            </button>
          </div>
        )}

        {/* Rolling / Landing phase */}
        {(phase === 'rolling' || phase === 'landing') && (
          <div className="conc-modal__roll-area">
            <span className={[
              'conc-modal__die',
              phase === 'rolling' ? 'conc-modal__die--spin' : '',
              phase === 'landing' ? 'conc-modal__die--land' : '',
            ].filter(Boolean).join(' ')}>
              {animNum}
            </span>
            <span className="conc-modal__roll-label">CON Save ({bonusStr})</span>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && rollResult !== null && total !== null && (
          <div className="conc-modal__result-area">
            <div className="conc-modal__equation">
              <div className="conc-modal__eq-raw-wrap">
                <span className={[
                  'conc-modal__eq-raw',
                  isNat20 ? 'conc-modal__eq-raw--nat20' : '',
                  isNat1 ? 'conc-modal__eq-raw--nat1' : '',
                ].filter(Boolean).join(' ')}>{rollResult}</span>
                <span className="conc-modal__eq-raw-label">d20</span>
              </div>
              <span className="conc-modal__eq-mod">{bonusStr}</span>
              <span className="conc-modal__eq-equals">=</span>
              <span className={[
                'conc-modal__eq-total',
                passed ? 'conc-modal__eq-total--pass' : 'conc-modal__eq-total--fail',
              ].filter(Boolean).join(' ')}>{total}</span>
            </div>

            <div className={`conc-modal__verdict ${passed ? 'conc-modal__verdict--pass' : 'conc-modal__verdict--fail'}`}>
              {isNat20 ? '✦ Natural 20 — Maintained! ✦'
                : isNat1 ? '✦ Natural 1 — Concentration Lost ✦'
                : passed ? 'Concentration Maintained'
                : 'Concentration Lost'}
            </div>

            <div className="conc-modal__result-actions">
              {passed ? (
                <button className="conc-modal__btn conc-modal__btn--keep conc-modal__btn--wide" onClick={onKeep}>
                  <span className="conc-modal__btn-text">Continue</span>
                </button>
              ) : (
                <button className="conc-modal__btn conc-modal__btn--break conc-modal__btn--wide" onClick={onBreak}>
                  <span className="conc-modal__btn-text">End Spell</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save info footer */}
        {phase === 'choose' && (
          <div className="conc-modal__footer">
            CON Save {bonusStr} vs DC {dc}
            {isProficient && <span className="conc-modal__prof-tag"> · Proficient</span>}
          </div>
        )}
      </div>
    </div>
  );
}
