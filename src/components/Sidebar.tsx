import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { Character } from '../types/character';
import type { PartyExport } from '../utils/importExport';
import { ImportExportControls } from './ImportExportControls';
import { ShareControls } from './ShareControls';
import { WatcherBadge } from './PlayerBanner';
import { InitiativeTracker } from './InitiativeTracker';
import { DiceRoller } from './DiceRoller';
import { RestsSection } from './RestsSection';
import { SpellCompendium } from './SpellCompendium';
import { loadBattleMapExport } from '../store/useBattleMapStore';

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

function DmTools({ addCharacter, onShowCompendium, characters, selectedId, onImport }: {
  addCharacter: () => void;
  onShowCompendium: () => void;
  characters: Character[];
  selectedId: string | null;
  onImport: (exported: PartyExport) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="dm-tools">
      <button className="dm-tools__header" onClick={() => setExpanded((e) => !e)}>
        <span className="dm-tools__chevron">{expanded ? '▾' : '▸'}</span>
        <span className="dm-tools__title">DM Tools</span>
      </button>
      {expanded && (
        <div className="dm-tools__body">
          <button className="btn-add-pc" onClick={addCharacter}>
            + New Adventurer
          </button>
          <button className="btn-compendium" onClick={onShowCompendium}>
            ✦ Spell Compendium
          </button>
          <div className="ie-divider" />
          <ImportExportControls
            characters={characters}
            selectedId={selectedId}
            onImport={onImport}
          />
          <div className="ie-divider" />
          <div className="ie-controls">
            <ShareControls />
          </div>
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  open?: boolean;
  onNavigate?: () => void;
  showBattleMap: boolean;
  onSetView: (view: 'roster' | 'map') => void;
}

export function Sidebar({ open, onNavigate, showBattleMap, onSetView }: SidebarProps) {
  const { characters, selectedId, addCharacter, removeCharacter, selectCharacter, replaceParty } = useStore();
  const [pendingRemove, setPendingRemove] = useState<Character | null>(null);
  const [showCompendium, setShowCompendium] = useState(false);

  const handleImport = useCallback((exported: PartyExport) => {
    replaceParty(exported);
    if (exported.battleMap) loadBattleMapExport(exported.battleMap);
  }, [replaceParty]);

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
        <WatcherBadge />
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav__btn${!showBattleMap ? ' sidebar-nav__btn--active' : ''}`}
          onClick={() => onSetView('roster')}
        >
          Party Roster
        </button>
        <button
          className={`sidebar-nav__btn${showBattleMap ? ' sidebar-nav__btn--active' : ''}`}
          onClick={() => onSetView('map')}
        >
          Battle Map
        </button>
      </nav>

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

      {showCompendium && (
        <SpellCompendium onClose={() => setShowCompendium(false)} />
      )}

      <DmTools
        addCharacter={addCharacter}
        onShowCompendium={() => setShowCompendium(true)}
        characters={characters}
        selectedId={selectedId}
        onImport={handleImport}
      />
    </aside>
  );
}
