import { useStore } from '../store/useStore';
import type { Character } from '../types/character';

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

export function Sidebar() {
  const { characters, selectedId, selectCharacter, addCharacter, removeCharacter, shortRest, longRest } = useStore();
  const hasSelected = selectedId !== null;

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
        <div className="rest-btn-row">
          <button
            className="btn-rest btn-rest--short"
            onClick={shortRest}
            disabled={!hasSelected}
            title="Short rest — restores SR resources"
          >
            ↺ Short
          </button>
          <button
            className="btn-rest btn-rest--long"
            onClick={longRest}
            disabled={!hasSelected}
            title="Long rest — restores all spell slots & LR/SR resources"
          >
            ↺ Long
          </button>
        </div>
        <button className="btn-add-pc" onClick={addCharacter}>
          + New Adventurer
        </button>
      </div>
    </aside>
  );
}
