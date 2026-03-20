import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Character } from '../types/character';
import { ImportExportControls } from './ImportExportControls';
import { ShareControls } from './ShareControls';
import { InitiativeTracker } from './InitiativeTracker';
import { DiceRoller } from './DiceRoller';
import { RestsSection } from './RestsSection';

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

interface SidebarProps {
  open?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { characters, selectedId, addCharacter, removeCharacter, selectCharacter, replaceParty } = useStore();
  const [pendingRemove, setPendingRemove] = useState<Character | null>(null);

  function confirmRemove() {
    if (pendingRemove) {
      removeCharacter(pendingRemove.id);
      setPendingRemove(null);
    }
  }

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">PhandaLedger</div>
        <div className="sidebar-subtitle">Party Roster</div>
      </div>

      <div className="pc-list">
        {characters.map((ch) => (
          <div
            key={ch.id}
            className={[
              'pc-item',
              ch.id === selectedId ? 'pc-item--selected' : '',
              ch.dead ? 'pc-item--dead' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => { selectCharacter(ch.id); onNavigate?.(); }}
          >
            <SidebarPortrait ch={ch} />
            <div className="pc-item__info">
              <span className="pc-item__name">
                {ch.dead && <span className="pc-item__dead-skull">☠</span>}
                {ch.name || 'Unnamed'}
              </span>
              <span className="pc-item__meta">
                {[ch.class, ch.race].filter(Boolean).join(' · ') || <em>No class set</em>}
              </span>
              <span className="pc-item__hp" style={{ color: ch.dead ? 'var(--accent-red-dim)' : hpColor(ch) }}>
                {ch.dead ? 'Dead' : `${ch.hp.current}/${ch.hp.max} hp`}
              </span>
            </div>
            <button
              className="pc-item__remove"
              title="Remove character"
              onClick={(e) => {
                e.stopPropagation();
                setPendingRemove(ch);
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {pendingRemove && (
        <div className="lr-modal-overlay" onClick={() => setPendingRemove(null)}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modal__header">
              <span className="lr-modal__title">Remove Character</span>
              <span className="lr-modal__subtitle">
                Are you sure you want to remove {pendingRemove.name || 'this character'} from the party? This cannot be undone.
              </span>
            </div>
            <div className="lr-modal__footer">
              <button className="lr-modal__btn lr-modal__btn--cancel" onClick={() => setPendingRemove(null)}>
                Cancel
              </button>
              <button className="lr-modal__btn lr-modal__btn--danger" onClick={confirmRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <InitiativeTracker />
      <DiceRoller />
      <RestsSection />

      <div className="sidebar-footer">
        <button className="btn-add-pc" onClick={addCharacter}>
          + New Adventurer
        </button>
        <div className="ie-divider" />
        <ImportExportControls
          characters={characters}
          selectedId={selectedId}
          onImport={replaceParty}
        />
        <div className="ie-divider" />
        <div className="ie-controls">
          <ShareControls />
        </div>
      </div>
    </aside>
  );
}
