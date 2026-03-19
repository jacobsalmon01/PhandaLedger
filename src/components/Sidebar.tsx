import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Character } from '../types/character';
import { ImportExportControls } from './ImportExportControls';

function SidebarPortrait({ ch }: { ch: Character }) {
  if (!ch.portrait) {
    return (
      <div className="pc-portrait pc-portrait--empty">
        <span className="pc-portrait__initial">
          {(ch.name || '?')[0].toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <div className="pc-portrait">
      <img
        src={ch.portrait}
        alt=""
        className="pc-portrait__img"
        style={{
          transform: `translate(${ch.portraitCrop.offsetX * 100}%, ${ch.portraitCrop.offsetY * 100}%) scale(${ch.portraitCrop.scale})`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
}

function hpColor(ch: Character): string {
  if (ch.hp.max <= 0) return 'var(--text-dim)';
  const pct = (ch.hp.current / ch.hp.max) * 100;
  if (pct > 60) return 'var(--hp-healthy)';
  if (pct > 25) return 'var(--hp-wounded)';
  return 'var(--hp-critical)';
}

/** Format a time input value ("21:00") into a display label ("9:00 PM") */
function formatRestLabel(timeValue: string): string {
  const [h, m] = timeValue.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeValue;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Derive a timestamp from an HH:MM string (today, or yesterday if the time is in the future) */
function timestampFromTime(timeValue: string): number {
  const [h, m] = timeValue.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.getTime();
}

/** Returns current HH:MM for the time input default */
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const SR_MAX = 2;
const LONG_REST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface LongRestModalProps {
  lastTimestamp: number | null;
  onConfirm: (label: string, timestamp: number) => void;
  onCancel: () => void;
}

function LongRestModal({ lastTimestamp, onConfirm, onCancel }: LongRestModalProps) {
  const [value, setValue] = useState(nowHHMM());

  const selectedTs = timestampFromTime(value);
  const msSinceLast = lastTimestamp ? selectedTs - lastTimestamp : Infinity;
  const tooSoon = isFinite(msSinceLast) && msSinceLast < LONG_REST_COOLDOWN_MS;
  const hoursRemaining = tooSoon
    ? Math.ceil((LONG_REST_COOLDOWN_MS - msSinceLast) / 3600000)
    : 0;

  function handleConfirm() {
    onConfirm(formatRestLabel(value), selectedTs);
  }

  return (
    <div className="lr-modal-overlay" onClick={onCancel}>
      <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lr-modal__header">
          <span className="lr-modal__title">Long Rest</span>
          <span className="lr-modal__subtitle">When did the party bed down?</span>
        </div>

        <div className="lr-modal__body">
          <label className="lr-modal__label">Rest began at</label>
          <input
            type="time"
            className="lr-modal__datetime"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          {tooSoon && (
            <div className="lr-modal__warning">
              ⚠ Only {hoursRemaining}h until full rest is available.
              The party is not yet recovered.
            </div>
          )}
        </div>

        <div className="lr-modal__footer">
          <button className="lr-modal__btn lr-modal__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`lr-modal__btn lr-modal__btn--confirm${tooSoon ? ' lr-modal__btn--warn' : ''}`}
            onClick={handleConfirm}
            disabled={isNaN(selectedTs)}
          >
            {tooSoon ? 'Rest Anyway' : 'Take Long Rest'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { characters, selectedId, selected, selectCharacter, addCharacter, removeCharacter, shortRest, longRest, replaceParty } = useStore();
  const [showLongRestModal, setShowLongRestModal] = useState(false);

  const hasSelected = selectedId !== null;
  const srUsed = selected?.shortRestsUsed ?? 0;
  const srRemaining = SR_MAX - srUsed;
  const canShortRest = hasSelected && srRemaining > 0;

  function handleLongRest(label: string, timestamp: number) {
    longRest(label, timestamp);
    setShowLongRestModal(false);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">PhandaLedger</div>
        <div className="sidebar-subtitle">Party Roster</div>
      </div>

      <div className="pc-list">
        {characters.map((ch) => (
          <div
            key={ch.id}
            className={`pc-item${ch.id === selectedId ? ' pc-item--selected' : ''}`}
            onClick={() => selectCharacter(ch.id)}
          >
            <SidebarPortrait ch={ch} />
            <div className="pc-item__info">
              <span className="pc-item__name">
                {ch.name || 'Unnamed'}
              </span>
              <span className="pc-item__meta">
                {[ch.class, ch.race].filter(Boolean).join(' · ') || <em>No class set</em>}
              </span>
              <span className="pc-item__hp" style={{ color: hpColor(ch) }}>
                {ch.hp.current}/{ch.hp.max} hp
              </span>
            </div>
            <button
              className="pc-item__remove"
              title="Remove character"
              onClick={(e) => {
                e.stopPropagation();
                removeCharacter(ch.id);
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        {/* Short rest — charge pips + button */}
        <div className="rest-section">
          <div className="rest-section__header">
            <span className="rest-section__label">Short Rest</span>
            <div className="sr-pips">
              {Array.from({ length: SR_MAX }).map((_, i) => (
                <span
                  key={i}
                  className={`sr-pip${i < srRemaining ? ' sr-pip--available' : ''}`}
                  title={i < srRemaining ? 'Charge available' : 'Charge spent'}
                />
              ))}
            </div>
          </div>
          <button
            className="btn-rest btn-rest--short"
            onClick={shortRest}
            disabled={!canShortRest}
            title={
              !hasSelected ? 'Select a character first'
              : srRemaining === 0 ? 'No short rest charges remaining — take a long rest'
              : `Short rest (${srRemaining} of ${SR_MAX} remaining)`
            }
          >
            ↺ Rest ({srRemaining}/{SR_MAX})
          </button>
        </div>

        {/* Long rest — cooldown status + button + timestamp */}
        <div className="rest-section">
          <div className="rest-section__header">
            <span className="rest-section__label">Long Rest</span>
          </div>
          <button
            className="btn-rest btn-rest--long"
            onClick={() => hasSelected && setShowLongRestModal(true)}
            disabled={!hasSelected}
            title={
              !hasSelected ? 'Select a character first'
              : 'Long rest — restores all spell slots & resources'
            }
          >
            ↺ Long Rest
          </button>
          {selected?.lastLongRestAt && (
            <div className="last-long-rest">
              Last: {selected.lastLongRestAt}
            </div>
          )}
        </div>

        <button className="btn-add-pc" onClick={addCharacter}>
          + New Adventurer
        </button>

        <div className="ie-divider" />
        <ImportExportControls
          characters={characters}
          selectedId={selectedId}
          onImport={replaceParty}
        />
      </div>

      {showLongRestModal && (
        <LongRestModal
          lastTimestamp={selected?.lastLongRestTimestamp ?? null}
          onConfirm={handleLongRest}
          onCancel={() => setShowLongRestModal(false)}
        />
      )}
    </aside>
  );
}
