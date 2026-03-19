import { useState, useRef, useCallback } from 'react';

type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;
type AdvMode = 'normal' | 'advantage' | 'disadvantage';

const DICE: DieType[] = [4, 6, 8, 10, 12, 20, 100];

function rollDie(faces: DieType): number {
  return Math.floor(Math.random() * faces) + 1;
}

interface RollResult {
  roll1: number;
  roll2: number;
  chosen: number;
  other: number;
  die: DieType;
  mode: AdvMode;
}

export function DiceRoller() {
  const [expanded, setExpanded] = useState(false);
  const [die, setDie] = useState<DieType>(20);
  const [mode, setMode] = useState<AdvMode>('normal');
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'landing' | 'done'>('idle');
  const [animNums, setAnimNums] = useState<[number, number]>([1, 1]);
  const [result, setResult] = useState<RollResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  const handleRoll = useCallback(() => {
    clearTimer();
    setPhase('rolling');
    setResult(null);

    const r1 = rollDie(die);
    const r2 = rollDie(die);
    let chosen: number, other: number;
    if (mode === 'advantage')    { chosen = Math.max(r1, r2); other = Math.min(r1, r2); }
    else if (mode === 'disadvantage') { chosen = Math.min(r1, r2); other = Math.max(r1, r2); }
    else                         { chosen = r1; other = r2; }

    let delay = 35;
    let step = 0;
    const totalSteps = 14;

    function tick() {
      step++;
      if (step >= totalSteps) {
        // Always show [chosen, other] so positions don't swap on done
        setAnimNums([chosen, other]);
        setPhase('landing');
        timerRef.current = setTimeout(() => {
          setPhase('done');
          setResult({ roll1: r1, roll2: r2, chosen, other, die, mode });
        }, 500);
        return;
      }
      setAnimNums([rollDie(die), rollDie(die)]);
      delay = Math.min(delay * 1.28, 130);
      timerRef.current = setTimeout(tick, delay);
    }

    tick();
  }, [die, mode]);

  const showTwo = mode !== 'normal';
  const isRolling = phase === 'rolling';
  const isLanding = phase === 'landing';
  const isDone = phase === 'done';
  const modeLabel = mode === 'advantage' ? 'ADV' : mode === 'disadvantage' ? 'DIS' : null;

  const displayMain = isRolling || isLanding ? animNums[0] : result?.chosen ?? null;
  const displayOther = isRolling || isLanding ? animNums[1] : result?.other ?? null;

  return (
    <div className="dice-roller">
      <button className="dice-roller__header" onClick={() => setExpanded((e) => !e)}>
        <span className="dice-roller__chevron">{expanded ? '▾' : '▸'}</span>
        <span className="dice-roller__title">Dice Roller</span>
        {isDone && result && (
          <span className="dice-roller__badge">
            {result.chosen}
            {modeLabel && (
              <span className={`dice-roller__badge-mode dice-roller__badge-mode--${result.mode}`}>
                {' '}{modeLabel}
              </span>
            )}
          </span>
        )}
      </button>

      {expanded && (
        <div className="dice-roller__body">

          {/* ── Die type selector ── */}
          <div className="dice-grid">
            {DICE.map((d) => (
              <button
                key={d}
                className={`dice-btn${die === d ? ' dice-btn--selected' : ''}`}
                onClick={() => setDie(d)}
                title={`d${d}`}
              >
                <svg className="dice-btn__icon" viewBox="0 0 100 100" aria-hidden="true">
                  {d === 4   && <polygon points="50,8 94,90 6,90" />}
                  {d === 6   && <rect x="13" y="13" width="74" height="74" rx="3" />}
                  {d === 8   && <polygon points="50,5 93,50 50,95 7,50" />}
                  {d === 10  && <polygon points="50,5 90,42 70,92 30,92 10,42" />}
                  {d === 12  && <polygon points="50,5 93,34 78,90 22,90 7,34" />}
                  {d === 20  && <polygon points="50,5 88,27 88,73 50,95 12,73 12,27" />}
                  {d === 100 && <circle cx="50" cy="50" r="42" />}
                </svg>
                <span className="dice-btn__label">d{d}</span>
              </button>
            ))}
          </div>

          {/* ── Advantage / disadvantage ── */}
          <div className="dice-adv-row">
            {(['normal', 'advantage', 'disadvantage'] as AdvMode[]).map((m) => (
              <button
                key={m}
                className={`dice-adv-btn dice-adv-btn--${m}${mode === m ? ' dice-adv-btn--active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'normal' ? 'Normal' : m === 'advantage' ? '+ Adv' : '− Dis'}
              </button>
            ))}
          </div>

          {/* ── Roll button ── */}
          <button
            className={`dice-roll-btn${isRolling || isLanding ? ' dice-roll-btn--rolling' : ''}`}
            onClick={handleRoll}
            disabled={isRolling || isLanding}
          >
            <span className="dice-roll-btn__ornament">◆</span>
            <span className="dice-roll-btn__text">
              {isRolling || isLanding ? 'Rolling…' : `Roll d${die}`}
            </span>
            <span className="dice-roll-btn__ornament">◆</span>
          </button>

          {/* ── Result stage ── */}
          {phase !== 'idle' && (
            <div className={`dice-result${isDone ? ' dice-result--done' : ''}`}>
              {showTwo ? (
                <div className="dice-result__pair">
                  <span
                    className={[
                      'dice-result__num',
                      (isRolling || isLanding) ? 'dice-result__num--roll' : '',
                      isRolling   ? 'dice-result__num--spin' : '',
                      isLanding   ? 'dice-result__num--land' : '',
                      isDone      ? 'dice-result__num--winner' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {displayMain}
                  </span>
                  <span className="dice-result__vs">vs</span>
                  <span
                    className={[
                      'dice-result__num',
                      (isRolling || isLanding) ? 'dice-result__num--roll' : '',
                      isRolling   ? 'dice-result__num--spin dice-result__num--spin-delay' : '',
                      isLanding   ? 'dice-result__num--land dice-result__num--land-delay' : '',
                      isDone      ? 'dice-result__num--loser' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {displayOther}
                  </span>
                </div>
              ) : (
                <span
                  className={[
                    'dice-result__num dice-result__num--solo',
                    isRolling   ? 'dice-result__num--spin' : '',
                    isLanding   ? 'dice-result__num--land' : '',
                    isDone      ? 'dice-result__num--winner' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {displayMain}
                </span>
              )}

              {isDone && result && (
                <div className="dice-result__label">
                  d{result.die}{modeLabel ? ` · ${modeLabel}` : ''}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
