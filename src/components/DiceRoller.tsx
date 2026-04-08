import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { abilityMod, profBonus } from '../types/character';
import type { AbilityScores } from '../types/character';
import { rollDie } from '../utils/rng';

type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;
type AdvMode = 'normal' | 'advantage' | 'disadvantage';
type SkillPhase = 'idle' | 'rolling' | 'landing' | 'revealing' | 'adding' | 'totaling' | 'done';

const DICE: DieType[] = [4, 6, 8, 10, 12, 20, 100];

interface SkillDef { key: string; label: string; ability: keyof AbilityScores; }

const SKILLS: SkillDef[] = [
  { key: 'acrobatics',     label: 'Acrobatics',     ability: 'dex' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wis' },
  { key: 'arcana',         label: 'Arcana',          ability: 'int' },
  { key: 'athletics',      label: 'Athletics',       ability: 'str' },
  { key: 'deception',      label: 'Deception',       ability: 'cha' },
  { key: 'history',        label: 'History',         ability: 'int' },
  { key: 'insight',        label: 'Insight',         ability: 'wis' },
  { key: 'intimidation',   label: 'Intimidation',    ability: 'cha' },
  { key: 'investigation',  label: 'Investigation',   ability: 'int' },
  { key: 'medicine',       label: 'Medicine',        ability: 'wis' },
  { key: 'nature',         label: 'Nature',          ability: 'int' },
  { key: 'perception',     label: 'Perception',      ability: 'wis' },
  { key: 'performance',    label: 'Performance',     ability: 'cha' },
  { key: 'persuasion',     label: 'Persuasion',      ability: 'cha' },
  { key: 'religion',       label: 'Religion',        ability: 'int' },
  { key: 'sleightOfHand',  label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth',        label: 'Stealth',         ability: 'dex' },
  { key: 'survival',       label: 'Survival',        ability: 'wis' },
];

interface FreeRollResult {
  roll1: number; roll2: number; chosen: number; other: number; die: DieType; mode: AdvMode;
}

interface SkillCheckResult {
  rawRoll: number; otherRoll: number | null; modifier: number; total: number;
  skillLabel: string; charName: string; proficient: boolean;
  mode: AdvMode; natType: 'nat20' | 'nat1' | null;
}

export function DiceRoller() {
  const { characters, selectedId } = useStore();

  const [expanded, setExpanded]   = useState(false);
  const [tab, setTab]             = useState<'free' | 'skill'>('free');

  // ── Free roll ──
  const [die, setDie]             = useState<DieType>(20);
  const [mode, setMode]           = useState<AdvMode>('normal');
  const [phase, setPhase]         = useState<'idle' | 'rolling' | 'landing' | 'done'>('idle');
  const [animNums, setAnimNums]   = useState<[number, number]>([1, 1]);
  const [result, setResult]       = useState<FreeRollResult | null>(null);
  const [natType, setNatType]     = useState<'nat20' | 'nat1' | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Skill check ──
  const [skillCharId, setSkillCharId]   = useState<string>('');
  const [skillKey, setSkillKey]         = useState<string>('perception');
  const [skillMode, setSkillMode]       = useState<AdvMode>('normal');
  const [skillPhase, setSkillPhase]     = useState<SkillPhase>('idle');
  const [skillAnimMain, setSkillAnimMain]   = useState<number>(1);
  const [skillAnimOther, setSkillAnimOther] = useState<number>(1);
  const [skillResult, setSkillResult]   = useState<SkillCheckResult | null>(null);
  const skillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedId && !skillCharId) setSkillCharId(selectedId);
  }, [selectedId, skillCharId]);

  function clearTimer()      { if (timerRef.current)      { clearTimeout(timerRef.current);      timerRef.current = null;      } }
  function clearSkillTimer() { if (skillTimerRef.current) { clearTimeout(skillTimerRef.current); skillTimerRef.current = null; } }

  // ── Free roll ──
  const handleRoll = useCallback(() => {
    clearTimer();
    setPhase('rolling'); setResult(null); setNatType(null);
    const r1 = rollDie(die), r2 = rollDie(die);
    let chosen: number, other: number;
    if (mode === 'advantage')         { chosen = Math.max(r1, r2); other = Math.min(r1, r2); }
    else if (mode === 'disadvantage') { chosen = Math.min(r1, r2); other = Math.max(r1, r2); }
    else                              { chosen = r1; other = r2; }
    if (die === 20) { if (chosen === 20) setNatType('nat20'); else if (chosen === 1) setNatType('nat1'); }
    let delay = 35, step = 0;
    function tick() {
      step++;
      if (step >= 14) {
        setAnimNums([chosen, other]); setPhase('landing');
        timerRef.current = setTimeout(() => { setPhase('done'); setResult({ roll1: r1, roll2: r2, chosen, other, die, mode }); }, 500);
        return;
      }
      setAnimNums([rollDie(die), rollDie(die)]);
      delay = Math.min(delay * 1.28, 130);
      timerRef.current = setTimeout(tick, delay);
    }
    tick();
  }, [die, mode]);

  // ── Skill check ──
  const handleSkillRoll = useCallback(() => {
    const ch = characters.find((c) => c.id === skillCharId);
    if (!ch) return;
    const skillDef = SKILLS.find((s) => s.key === skillKey)!;
    const isProficient = ch.skillProficiencies.includes(skillKey);
    const mod = abilityMod(ch.abilities[skillDef.ability]) + (isProficient ? profBonus(ch.level) : 0);
    const charName = ch.name || 'Character';

    clearSkillTimer();
    setSkillPhase('rolling'); setSkillResult(null);
    const r1 = rollDie(20), r2 = rollDie(20);
    let chosen: number, other: number;
    if (skillMode === 'advantage')         { chosen = Math.max(r1, r2); other = Math.min(r1, r2); }
    else if (skillMode === 'disadvantage') { chosen = Math.min(r1, r2); other = Math.max(r1, r2); }
    else                                   { chosen = r1; other = r2; }
    const nt: 'nat20' | 'nat1' | null = chosen === 20 ? 'nat20' : chosen === 1 ? 'nat1' : null;
    let delay = 35, step = 0;

    function tick() {
      step++;
      if (step >= 14) {
        setSkillAnimMain(chosen); setSkillAnimOther(other);
        setSkillPhase('landing');
        const resolvedResult: SkillCheckResult = {
          rawRoll: chosen, otherRoll: skillMode !== 'normal' ? other : null,
          modifier: mod, total: chosen + mod,
          skillLabel: skillDef.label, charName,
          proficient: isProficient, mode: skillMode, natType: nt,
        };
        skillTimerRef.current = setTimeout(() => {
          setSkillPhase('revealing');
          setSkillResult(resolvedResult);
          skillTimerRef.current = setTimeout(() => {
            setSkillPhase('adding');
            skillTimerRef.current = setTimeout(() => {
              setSkillPhase('totaling');
              skillTimerRef.current = setTimeout(() => setSkillPhase('done'), 600);
            }, 500);
          }, 400);
        }, 380);
        return;
      }
      setSkillAnimMain(rollDie(20)); setSkillAnimOther(rollDie(20));
      delay = Math.min(delay * 1.28, 130);
      skillTimerRef.current = setTimeout(tick, delay);
    }
    tick();
  }, [characters, skillCharId, skillKey, skillMode]);

  // ── Derived ──
  const isRollingFree  = phase === 'rolling',  isLandingFree = phase === 'landing', isDoneFree = phase === 'done';
  const showTwoFree    = mode !== 'normal';
  const modeLabel      = mode === 'advantage' ? 'ADV' : mode === 'disadvantage' ? 'DIS' : null;
  const displayMain    = (isRollingFree || isLandingFree) ? animNums[0] : result?.chosen ?? null;
  const displayOther   = (isRollingFree || isLandingFree) ? animNums[1] : result?.other ?? null;

  const isSkillRolling   = skillPhase === 'rolling', isSkillLanding   = skillPhase === 'landing';
  const isSkillRevealing = skillPhase === 'revealing';
  const isSkillAdding    = skillPhase === 'adding',  isSkillTotaling  = skillPhase === 'totaling';
  const isSkillDone      = skillPhase === 'done';
  const skillShowTwo     = skillMode !== 'normal';
  const skillDispMain    = (isSkillRolling || isSkillLanding) ? skillAnimMain  : (skillResult?.rawRoll  ?? skillAnimMain);
  const skillDispOther   = (isSkillRolling || isSkillLanding) ? skillAnimOther : (skillResult?.otherRoll ?? skillAnimOther);
  const skillPostLand    = isSkillRevealing || isSkillAdding || isSkillTotaling || isSkillDone;

  const selectedChar       = characters.find((c) => c.id === skillCharId) ?? null;
  const currentSkillDef    = SKILLS.find((s) => s.key === skillKey)!;
  const currentProficient  = selectedChar?.skillProficiencies.includes(skillKey) ?? false;
  const currentMod         = selectedChar
    ? abilityMod(selectedChar.abilities[currentSkillDef.ability]) + (currentProficient ? profBonus(selectedChar.level) : 0)
    : null;

  const badgeContent = tab === 'free'
    ? (isDoneFree && result ? String(result.chosen) : null)
    : ((isSkillAdding || isSkillTotaling || isSkillDone) && skillResult ? String(skillResult.total)
       : (isSkillRevealing && skillResult ? String(skillResult.rawRoll) : null));

  return (
    <div className="dice-roller">
      <button className="dice-roller__header" onClick={() => setExpanded((e) => !e)}>
        <span className="dice-roller__chevron">{expanded ? '▾' : '▸'}</span>
        <span className="dice-roller__title">Dice Roller</span>
        {badgeContent && (
          <span className="dice-roller__badge">
            {badgeContent}
            {tab === 'free' && modeLabel && (
              <span className={`dice-roller__badge-mode dice-roller__badge-mode--${result?.mode}`}>{' '}{modeLabel}</span>
            )}
            {tab === 'skill' && skillResult && (
              <span className="dice-roller__badge-skill"> {skillResult.skillLabel}</span>
            )}
          </span>
        )}
      </button>

      {expanded && (
        <div className="dice-roller__body">

          {/* ── Tabs ── */}
          <div className="dice-tab-row">
            <button className={`dice-tab-btn${tab === 'free'  ? ' dice-tab-btn--active' : ''}`} onClick={() => setTab('free')}>Free Roll</button>
            <button className={`dice-tab-btn${tab === 'skill' ? ' dice-tab-btn--active' : ''}`} onClick={() => setTab('skill')}>Skill Check</button>
          </div>

          {tab === 'free' ? (
            <>
              <div className="dice-grid">
                {DICE.map((d) => (
                  <button key={d} className={`dice-btn${die === d ? ' dice-btn--selected' : ''}`} onClick={() => setDie(d)}>d{d}</button>
                ))}
              </div>

              <div className="dice-adv-row">
                {(['normal', 'advantage', 'disadvantage'] as AdvMode[]).map((m) => (
                  <button key={m} className={`dice-adv-btn dice-adv-btn--${m}${mode === m ? ' dice-adv-btn--active' : ''}`} onClick={() => setMode(m)}>
                    {m === 'normal' ? 'Normal' : m === 'advantage' ? '+ Adv' : '− Dis'}
                  </button>
                ))}
              </div>

              <button className={`dice-roll-btn${(isRollingFree || isLandingFree) ? ' dice-roll-btn--rolling' : ''}`} onClick={handleRoll} disabled={isRollingFree || isLandingFree}>
                <span className="dice-roll-btn__ornament">◆</span>
                <span className="dice-roll-btn__text">{(isRollingFree || isLandingFree) ? 'Rolling…' : `Roll d${die}`}</span>
                <span className="dice-roll-btn__ornament">◆</span>
              </button>

              {phase !== 'idle' && (
                <div className={['dice-result', isDoneFree ? 'dice-result--done' : '', natType === 'nat20' && (isLandingFree || isDoneFree) ? 'dice-result--nat20' : '', natType === 'nat1' && (isLandingFree || isDoneFree) ? 'dice-result--nat1' : ''].filter(Boolean).join(' ')}>
                  {showTwoFree ? (
                    <div className="dice-result__pair">
                      <span className={['dice-result__num', (isRollingFree || isLandingFree) ? 'dice-result__num--roll' : '', isRollingFree ? 'dice-result__num--spin' : '', isLandingFree ? (natType === 'nat20' ? 'dice-result__num--land-nat20' : natType === 'nat1' ? 'dice-result__num--land-nat1' : 'dice-result__num--land') : '', isDoneFree ? 'dice-result__num--winner' : '', isDoneFree && natType === 'nat1' ? 'dice-result__num--nat1' : ''].filter(Boolean).join(' ')}>{displayMain}</span>
                      <span className="dice-result__vs">vs</span>
                      <span className={['dice-result__num', (isRollingFree || isLandingFree) ? 'dice-result__num--roll' : '', isRollingFree ? 'dice-result__num--spin dice-result__num--spin-delay' : '', isLandingFree ? 'dice-result__num--land dice-result__num--land-delay' : '', isDoneFree ? 'dice-result__num--loser' : ''].filter(Boolean).join(' ')}>{displayOther}</span>
                    </div>
                  ) : (
                    <span className={['dice-result__num dice-result__num--solo', isRollingFree ? 'dice-result__num--spin' : '', isLandingFree ? (natType === 'nat20' ? 'dice-result__num--land-nat20' : natType === 'nat1' ? 'dice-result__num--land-nat1' : 'dice-result__num--land') : '', isDoneFree ? 'dice-result__num--winner' : '', isDoneFree && natType === 'nat1' ? 'dice-result__num--nat1' : ''].filter(Boolean).join(' ')}>{displayMain}</span>
                  )}
                  {isDoneFree && result && <div className="dice-result__label">d{result.die}{modeLabel ? ` · ${modeLabel}` : ''}</div>}
                  {isDoneFree && natType === 'nat20' && <div className="dice-nat-label dice-nat-label--nat20">✦ Natural 20 ✦</div>}
                  {isDoneFree && natType === 'nat1'  && <div className="dice-nat-label dice-nat-label--nat1">✦ Critical Fail ✦</div>}
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── Skill selectors ── */}
              <div className="skill-check-fields">
                <div className="skill-check-field">
                  <label className="skill-check-label">Character</label>
                  <select className="skill-check-select" value={skillCharId} onChange={(e) => setSkillCharId(e.target.value)}>
                    {characters.length === 0 && <option value="">No characters</option>}
                    {characters.map((c) => <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>)}
                  </select>
                </div>
                <div className="skill-check-field">
                  <label className="skill-check-label">Skill</label>
                  <select className="skill-check-select" value={skillKey} onChange={(e) => setSkillKey(e.target.value)}>
                    {SKILLS.map((s) => {
                      if (!selectedChar) return <option key={s.key} value={s.key}>{s.label}</option>;
                      const ch = selectedChar;
                      const prof = ch.skillProficiencies.includes(s.key);
                      const m = abilityMod(ch.abilities[s.ability]) + (prof ? profBonus(ch.level) : 0);
                      return <option key={s.key} value={s.key}>{s.label} ({m >= 0 ? '+' : ''}{m}{prof ? ' ★' : ''})</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* ── Modifier preview ── */}
              {selectedChar && currentMod !== null && (
                <div className="skill-mod-preview">
                  <span className="skill-mod-preview__value">{currentMod >= 0 ? `+${currentMod}` : `${currentMod}`}</span>
                  <span className="skill-mod-preview__name">{currentSkillDef.label}</span>
                  {currentProficient && <span className="skill-mod-preview__prof">Proficient</span>}
                </div>
              )}

              <div className="dice-adv-row">
                {(['normal', 'advantage', 'disadvantage'] as AdvMode[]).map((m) => (
                  <button key={m} className={`dice-adv-btn dice-adv-btn--${m}${skillMode === m ? ' dice-adv-btn--active' : ''}`} onClick={() => setSkillMode(m)}>
                    {m === 'normal' ? 'Normal' : m === 'advantage' ? '+ Adv' : '− Dis'}
                  </button>
                ))}
              </div>

              <button className={`dice-roll-btn${(isSkillRolling || isSkillLanding) ? ' dice-roll-btn--rolling' : ''}`} onClick={handleSkillRoll} disabled={isSkillRolling || isSkillLanding || !skillCharId}>
                <span className="dice-roll-btn__ornament">◆</span>
                <span className="dice-roll-btn__text">{(isSkillRolling || isSkillLanding) ? 'Rolling…' : `Roll ${currentSkillDef.label}`}</span>
                <span className="dice-roll-btn__ornament">◆</span>
              </button>

              {/* ── Result ── */}
              {skillPhase !== 'idle' && (
                <div className={['skill-check-result', skillPostLand ? 'skill-check-result--resolving' : '', (isSkillTotaling || isSkillDone) ? 'skill-check-result--done' : '', skillResult?.natType === 'nat20' && skillPostLand ? 'skill-check-result--nat20' : '', skillResult?.natType === 'nat1' && skillPostLand ? 'skill-check-result--nat1' : ''].filter(Boolean).join(' ')}>

                  {/* Spinning d20 — visible during rolling & landing */}
                  {(isSkillRolling || isSkillLanding) && (
                    skillShowTwo ? (
                      <div className="dice-result__pair">
                        <span className={['dice-result__num dice-result__num--roll', isSkillRolling ? 'dice-result__num--spin' : '', isSkillLanding ? 'dice-result__num--land' : ''].filter(Boolean).join(' ')}>{skillDispMain}</span>
                        <span className="dice-result__vs">vs</span>
                        <span className={['dice-result__num dice-result__num--roll', isSkillRolling ? 'dice-result__num--spin dice-result__num--spin-delay' : '', isSkillLanding ? 'dice-result__num--land dice-result__num--land-delay' : ''].filter(Boolean).join(' ')}>{skillDispOther}</span>
                      </div>
                    ) : (
                      <span className={['dice-result__num dice-result__num--solo', isSkillRolling ? 'dice-result__num--spin' : '', isSkillLanding ? 'dice-result__num--land' : ''].filter(Boolean).join(' ')}>{skillDispMain}</span>
                    )
                  )}

                  {/* Equation: crossfade in from dice, then build up */}
                  {skillPostLand && skillResult && (
                    <>
                      <div className={`skill-equation${isSkillRevealing ? ' skill-equation--reveal' : ''}`}>
                        <div className={`skill-eq__raw-wrap${isSkillRevealing ? ' skill-eq__raw-wrap--enter' : ''}`}>
                          <span className={['skill-eq__raw', skillResult.natType === 'nat20' ? 'skill-eq__raw--nat20' : '', skillResult.natType === 'nat1' ? 'skill-eq__raw--nat1' : ''].filter(Boolean).join(' ')}>{skillResult.rawRoll}</span>
                        </div>
                        {(isSkillAdding || isSkillTotaling || isSkillDone) && (
                          <span className={`skill-eq__mod${isSkillAdding ? ' skill-eq__mod--enter' : ''}`}>
                            {skillResult.modifier >= 0 ? <><span className="skill-eq__mod-sign">+</span>{skillResult.modifier}</> : <><span className="skill-eq__mod-sign">−</span>{Math.abs(skillResult.modifier)}</>}
                          </span>
                        )}
                        {(isSkillTotaling || isSkillDone) && (
                          <>
                            <span className="skill-eq__equals">=</span>
                            <span className={['skill-eq__total', isSkillTotaling ? 'skill-eq__total--enter' : '', skillResult.natType === 'nat1' ? 'skill-eq__total--nat1' : '', skillResult.natType === 'nat20' ? 'skill-eq__total--nat20' : ''].filter(Boolean).join(' ')}>
                              {skillResult.total}
                            </span>
                          </>
                        )}
                      </div>

                      <div className={`skill-check-result__meta${isSkillRevealing ? ' skill-check-result__meta--enter' : ''}`}>
                        {skillResult.skillLabel}
                        {skillResult.proficient && <span className="skill-check-result__prof"> · Proficient</span>}
                        {skillResult.mode !== 'normal' && (
                          <span className={`skill-check-result__adv skill-check-result__adv--${skillResult.mode}`}>
                            {' · '}{skillResult.mode === 'advantage' ? 'ADV' : 'DIS'}
                          </span>
                        )}
                      </div>

                      {(isSkillTotaling || isSkillDone) && skillResult.natType === 'nat20' && <div className="dice-nat-label dice-nat-label--nat20 dice-nat-label--skill">✦ Natural 20 ✦</div>}
                      {(isSkillTotaling || isSkillDone) && skillResult.natType === 'nat1'  && <div className="dice-nat-label dice-nat-label--nat1 dice-nat-label--skill">✦ Critical Fail ✦</div>}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
