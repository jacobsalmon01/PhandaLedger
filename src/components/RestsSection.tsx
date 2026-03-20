import { useState } from 'react';
import { useStore } from '../store/useStore';

const SR_MAX = 2;
const LONG_REST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type RestScope = 'character' | 'party';
type PendingRest = { type: 'short' | 'long' };

function formatRestLabel(timeValue: string): string {
  const [h, m] = timeValue.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeValue;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function timestampFromTime(timeValue: string): number {
  const [h, m] = timeValue.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.getTime();
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function RestsSection() {
  const { selected, selectedId, characters, shortRest, longRest, shortRestAll, longRestAll } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<PendingRest | null>(null);
  const [scope, setScope] = useState<RestScope | null>(null);
  const [timeValue, setTimeValue] = useState(nowHHMM());

  const hasSelected = selectedId !== null;
  const srUsed = selected?.shortRestsUsed ?? 0;
  const srRemaining = SR_MAX - srUsed;
  const canShortRest = hasSelected && srRemaining > 0;
  const partySize = characters.length;

  const selectedTs = timestampFromTime(timeValue);
  const lastTs = selected?.lastLongRestTimestamp ?? null;
  const msSinceLast = lastTs ? selectedTs - lastTs : Infinity;
  const tooSoon = isFinite(msSinceLast) && msSinceLast < LONG_REST_COOLDOWN_MS;
  const hoursRemaining = tooSoon
    ? Math.ceil((LONG_REST_COOLDOWN_MS - msSinceLast) / 3600000)
    : 0;

  function startRest(type: 'short' | 'long') {
    if (partySize <= 1) {
      // Only one character — skip the scope prompt
      if (type === 'short') {
        shortRest();
      } else {
        setScope('character');
        setPending({ type: 'long' });
        setTimeValue(nowHHMM());
      }
      return;
    }
    setPending({ type });
    setScope(null);
    setTimeValue(nowHHMM());
  }

  function chooseScope(chosen: RestScope) {
    if (!pending) return;
    if (pending.type === 'short') {
      if (chosen === 'character') shortRest();
      else shortRestAll();
      setPending(null);
      setScope(null);
    } else {
      // Long rest — proceed to time picker
      setScope(chosen);
    }
  }

  function confirmLongRest() {
    if (!scope) return;
    const label = formatRestLabel(timeValue);
    if (scope === 'character') longRest(label, selectedTs);
    else longRestAll(label, selectedTs);
    setPending(null);
    setScope(null);
  }

  function cancelRest() {
    setPending(null);
    setScope(null);
  }

  const showScopePrompt = pending !== null && scope === null;
  const showLongRestModal = pending?.type === 'long' && scope !== null;
  const charName = selected?.name || 'Character';

  return (
    <>
      <div className="rests-section">
        <button
          className="rests-section__header"
          onClick={() => setExpanded((e) => !e)}
        >
          <span className="rests-section__chevron">{expanded ? '▾' : '▸'}</span>
          <span className="rests-section__title">Rests</span>
          {srRemaining < SR_MAX && (
            <span className="rests-section__badge">{srRemaining}/{SR_MAX} SR</span>
          )}
        </button>

        {expanded && (
          <div className="rests-section__body">
            {/* ── Short Rest ── */}
            <div className="rest-row">
              <div className="rest-row__info">
                <span className="rest-row__name">Short Rest</span>
                <div className="sr-pips">
                  {Array.from({ length: SR_MAX }).map((_, i) => (
                    <span
                      key={i}
                      className={`sr-pip${i < srRemaining ? ' sr-pip--available' : ''}`}
                      title={i < srRemaining ? 'Available' : 'Spent'}
                    />
                  ))}
                </div>
              </div>
              <button
                className="rest-btn rest-btn--short"
                onClick={() => startRest('short')}
                disabled={!canShortRest}
                title={
                  !hasSelected ? 'Select a character first'
                  : srRemaining === 0 ? 'No charges remaining'
                  : `Take short rest (${srRemaining} of ${SR_MAX} remaining)`
                }
              >
                ↺ Rest
              </button>
            </div>

            {/* ── Long Rest ── */}
            <div className="rest-row">
              <div className="rest-row__info">
                <span className="rest-row__name">Long Rest</span>
                {selected?.lastLongRestAt && (
                  <span className="rest-row__last">Last: {selected.lastLongRestAt}</span>
                )}
              </div>
              <button
                className="rest-btn rest-btn--long"
                onClick={() => startRest('long')}
                disabled={!hasSelected}
                title={
                  !hasSelected ? 'Select a character first'
                  : 'Long rest — restores all spell slots & resources'
                }
              >
                ↺ Long Rest
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scope Prompt Modal ── */}
      {showScopePrompt && (
        <div className="lr-modal-overlay" onClick={cancelRest}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modal__header">
              <span className="lr-modal__title">
                {pending.type === 'short' ? 'Short Rest' : 'Long Rest'}
              </span>
              <span className="lr-modal__subtitle">
                Who is resting?
              </span>
            </div>
            <div className="rest-scope-actions">
              <button className="rest-scope-btn" onClick={() => chooseScope('character')}>
                <span className="rest-scope-btn__text">{charName}</span>
                <span className="rest-scope-btn__sub">Selected character only</span>
              </button>
              <button className="rest-scope-btn" onClick={() => chooseScope('party')}>
                <span className="rest-scope-btn__text">Entire Party</span>
                <span className="rest-scope-btn__sub">All {partySize} characters</span>
              </button>
            </div>
            <div className="lr-modal__footer">
              <button className="lr-modal__btn lr-modal__btn--cancel" onClick={cancelRest}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Long Rest Time Modal ── */}
      {showLongRestModal && (
        <div className="lr-modal-overlay" onClick={cancelRest}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modal__header">
              <span className="lr-modal__title">Long Rest</span>
              <span className="lr-modal__subtitle">
                {scope === 'party'
                  ? 'When did the party bed down?'
                  : `When did ${charName} bed down?`}
              </span>
            </div>
            <div className="lr-modal__body">
              <label className="lr-modal__label">Rest began at</label>
              <input
                type="time"
                className="lr-modal__datetime"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
              />
              {tooSoon && scope === 'character' && (
                <div className="lr-modal__warning">
                  ⚠ Only {hoursRemaining}h until full rest is available.
                  {charName} is not yet recovered.
                </div>
              )}
            </div>
            <div className="lr-modal__footer">
              <button className="lr-modal__btn lr-modal__btn--cancel" onClick={cancelRest}>
                Cancel
              </button>
              <button
                className={`lr-modal__btn lr-modal__btn--confirm${tooSoon && scope === 'character' ? ' lr-modal__btn--warn' : ''}`}
                onClick={confirmLongRest}
                disabled={isNaN(selectedTs)}
              >
                {tooSoon && scope === 'character'
                  ? 'Rest Anyway'
                  : scope === 'party'
                    ? 'Rest the Party'
                    : 'Take Long Rest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
