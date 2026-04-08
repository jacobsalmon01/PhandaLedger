import { useState, useRef, useCallback } from 'react';
import type { Character } from '../types/character';
import { rollDie } from '../utils/rng';

type Phase = 'choose' | 'rolling' | 'landing' | 'result';
type RollOutcome = 'nat20' | 'nat1' | 'success' | 'failure';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
  onDismiss: () => void;
}

export function DeathSavingThrowModal({ ch, updateSelected, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [animNum, setAnimNum] = useState(1);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [rollOutcome, setRollOutcome] = useState<RollOutcome | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saves = ch.deathSaves ?? { successes: 0, failures: 0 };
  const successes = saves.successes;
  const failures = saves.failures;
  const isDead = failures >= 3;
  const isStabilized = successes >= 3;

  // Terminal state is only entered once the user returns to 'choose' after a terminal result
  const showTerminal = (isDead || isStabilized) && phase === 'choose';

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  function addSuccess(count = 1) {
    updateSelected((c) => {
      const newSuccesses = Math.min(3, (c.deathSaves?.successes ?? 0) + count);
      return {
        ...c,
        hp: newSuccesses >= 3 ? { ...c.hp, current: 1 } : c.hp,
        deathSaves: newSuccesses >= 3
          ? { successes: 0, failures: 0 }
          : { successes: newSuccesses, failures: c.deathSaves?.failures ?? 0 },
      };
    });
  }

  function addFailure(count = 1) {
    updateSelected((c) => {
      const newFailures = Math.min(3, (c.deathSaves?.failures ?? 0) + count);
      return {
        ...c,
        deathSaves: {
          successes: c.deathSaves?.successes ?? 0,
          failures: newFailures,
        },
        dead: newFailures >= 3 ? true : (c.dead ?? false),
      };
    });
  }

  const handleRoll = useCallback(() => {
    clearTimer();
    setPhase('rolling');
    setRollResult(null);
    setRollOutcome(null);

    const finalRoll = rollDie(20);
    let delay = 35;
    let step = 0;

    function tick() {
      step++;
      if (step >= 14) {
        setAnimNum(finalRoll);
        setPhase('landing');
        timerRef.current = setTimeout(() => {
          setRollResult(finalRoll);
          setPhase('result');

          if (finalRoll === 20) {
            setRollOutcome('nat20');
            updateSelected((c) => ({
              ...c,
              hp: { ...c.hp, current: 1 },
              deathSaves: { successes: 0, failures: 0 },
            }));
          } else if (finalRoll === 1) {
            setRollOutcome('nat1');
            addFailure(2);
          } else if (finalRoll >= 10) {
            setRollOutcome('success');
            addSuccess(1);
          } else {
            setRollOutcome('failure');
            addFailure(1);
          }
        }, 500);
        return;
      }
      setAnimNum(rollDie(20));
      delay = Math.min(delay * 1.28, 130);
      timerRef.current = setTimeout(tick, delay);
    }
    tick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateSelected]);

  function handleContinue() {
    setPhase('choose');
    setRollResult(null);
    setRollOutcome(null);
  }

  function resetSaves() {
    updateSelected((c) => ({
      ...c,
      deathSaves: { successes: 0, failures: 0 },
    }));
    setPhase('choose');
  }

  function renderPips(filled: number, total: number, type: 'success' | 'failure') {
    return Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className={`death-pip death-pip--${type} ${i < filled ? 'death-pip--filled' : 'death-pip--empty'}`}
      />
    ));
  }

  const overlayClass = [
    'death-modal-overlay',
    isDead && phase === 'choose' ? 'death-modal-overlay--dead' : '',
  ].filter(Boolean).join(' ');

  const modalClass = [
    'death-modal',
    isDead && phase === 'choose' ? 'death-modal--dead' : '',
    isStabilized && !isDead && phase === 'choose' ? 'death-modal--stabilized' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={overlayClass}
      onClick={(e) => {
        if (e.target === e.currentTarget && phase === 'choose' && !showTerminal) onDismiss();
      }}
    >
      <div className={modalClass}>

        {/* Close button — only when not in terminal state */}
        {!showTerminal && (
          <button className="death-modal__close" onClick={onDismiss} title="Dismiss">✕</button>
        )}

        {/* Header */}
        <div className="death-modal__header">
          <span className="death-modal__icon">
            {isDead && phase === 'choose' ? '☠' : isStabilized && phase === 'choose' ? '✦' : '☠'}
          </span>
          <div className="death-modal__header-text">
            <span className="death-modal__title">
              {isDead && phase === 'choose'
                ? 'Character Slain'
                : isStabilized && phase === 'choose'
                ? 'Stabilized'
                : 'Death Saving Throws'}
            </span>
            <span className="death-modal__subtitle">
              {isDead && phase === 'choose'
                ? `${ch.name || 'The character'} has succumbed to their wounds.`
                : isStabilized && phase === 'choose'
                ? `${ch.name || 'The character'} is unconscious but breathing steadily.`
                : `${ch.name || 'The character'} is dying — roll to survive.`}
            </span>
          </div>
        </div>

        {/* Pips — always visible */}
        <div className="death-modal__pips">
          <div className="death-modal__pip-row">
            <span className="death-modal__pip-label">Successes</span>
            <div className="death-modal__pip-track">
              {renderPips(successes, 3, 'success')}
            </div>
          </div>
          <div className="death-modal__pip-row">
            <span className="death-modal__pip-label">Failures</span>
            <div className="death-modal__pip-track">
              {renderPips(failures, 3, 'failure')}
            </div>
          </div>
        </div>

        {/* Choose phase: action buttons */}
        {phase === 'choose' && !showTerminal && (
          <div className="death-modal__actions">
            <button className="death-modal__btn death-modal__btn--roll" onClick={handleRoll}>
              <span className="death-modal__btn-icon">⚄</span>
              <span className="death-modal__btn-text">Roll D20</span>
              <span className="death-modal__btn-sub">10+ to succeed</span>
            </button>
            <button className="death-modal__btn death-modal__btn--failure" onClick={() => addFailure(1)}>
              <span className="death-modal__btn-icon">✕</span>
              <span className="death-modal__btn-text">Add Failure</span>
              <span className="death-modal__btn-sub">DM override</span>
            </button>
            <button className="death-modal__btn death-modal__btn--success" onClick={() => addSuccess(1)}>
              <span className="death-modal__btn-icon">✓</span>
              <span className="death-modal__btn-text">Add Success</span>
              <span className="death-modal__btn-sub">DM override</span>
            </button>
          </div>
        )}

        {/* Rolling / Landing phase */}
        {(phase === 'rolling' || phase === 'landing') && (
          <div className="death-modal__roll-area">
            <span className={[
              'death-modal__die',
              phase === 'rolling' ? 'death-modal__die--spin' : '',
              phase === 'landing' ? 'death-modal__die--land' : '',
            ].filter(Boolean).join(' ')}>
              {animNum}
            </span>
            <span className="death-modal__roll-label">D20</span>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && rollResult !== null && (
          <div className="death-modal__result-area">
            <div className="death-modal__result-roll">
              <span className={[
                'death-modal__result-num',
                rollOutcome === 'nat20' ? 'death-modal__result-num--nat20' : '',
                rollOutcome === 'nat1' ? 'death-modal__result-num--nat1' : '',
                rollOutcome === 'success' ? 'death-modal__result-num--success' : '',
                rollOutcome === 'failure' ? 'death-modal__result-num--failure' : '',
              ].filter(Boolean).join(' ')}>{rollResult}</span>
              <span className="death-modal__result-die-label">d20</span>
            </div>
            <div className={[
              'death-modal__verdict',
              rollOutcome === 'nat20' ? 'death-modal__verdict--nat20' : '',
              rollOutcome === 'nat1' ? 'death-modal__verdict--nat1' : '',
              rollOutcome === 'success' ? 'death-modal__verdict--success' : '',
              rollOutcome === 'failure' ? 'death-modal__verdict--failure' : '',
            ].filter(Boolean).join(' ')}>
              {rollOutcome === 'nat20' && '✦ Natural 20 — You Revive! ✦'}
              {rollOutcome === 'nat1' && '☠ Natural 1 — Two Failures ☠'}
              {rollOutcome === 'success' && 'Success — Hold On...'}
              {rollOutcome === 'failure' && 'Failure — Slipping Away...'}
            </div>
            <button className="death-modal__continue-btn" onClick={handleContinue}>
              Continue
            </button>
          </div>
        )}

        {/* Terminal: Dead */}
        {showTerminal && isDead && (
          <div className="death-modal__terminal">
            <p className="death-modal__terminal-text">
              The last breath has been drawn. {ch.name || 'The character'} is gone.
            </p>
            <div className="death-modal__terminal-actions">
              <button className="death-modal__btn death-modal__btn--roll death-modal__btn--wide" onClick={onDismiss}>
                <span className="death-modal__btn-text">Close</span>
              </button>
            </div>
          </div>
        )}

        {/* Terminal: Stabilized */}
        {showTerminal && isStabilized && !isDead && (
          <div className="death-modal__terminal">
            <p className="death-modal__terminal-text">
              No longer in danger of dying. A long rest will restore consciousness.
            </p>
            <div className="death-modal__terminal-actions">
              <button className="death-modal__btn death-modal__btn--success death-modal__btn--wide" onClick={resetSaves}>
                <span className="death-modal__btn-text">Reset Saves</span>
              </button>
              <button className="death-modal__btn death-modal__btn--roll death-modal__btn--wide" onClick={onDismiss}>
                <span className="death-modal__btn-text">Dismiss</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {phase === 'choose' && !showTerminal && (
          <div className="death-modal__footer">
            10+ to succeed · Nat 20 revives · Nat 1 counts as two failures
          </div>
        )}

      </div>
    </div>
  );
}
