import { useStore } from '../store/useStore';
import type { Character } from '../types/character';

function hpColor(ch: Character): string {
  if (ch.hp.max <= 0) return 'var(--text-dim)';
  const pct = (ch.hp.current / ch.hp.max) * 100;
  if (pct > 60) return 'var(--hp-healthy)';
  if (pct > 25) return 'var(--hp-wounded)';
  return 'var(--hp-critical)';
}

export function Sidebar() {
  const { characters, selectedId, selectCharacter, addCharacter, removeCharacter } = useStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Phanda Ledger</div>
        <div className="sidebar-subtitle">Party Roster</div>
      </div>

      <div className="pc-list">
        {characters.map((ch) => (
          <div
            key={ch.id}
            className={`pc-item${ch.id === selectedId ? ' pc-item--selected' : ''}`}
            onClick={() => selectCharacter(ch.id)}
          >
            <span className="pc-item__name">
              {ch.name || 'Unnamed'}
            </span>
            <span className="pc-item__hp" style={{ color: hpColor(ch) }}>
              {ch.hp.current}/{ch.hp.max}
            </span>
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
        <button className="btn-add-pc" onClick={addCharacter}>
          + New Adventurer
        </button>
      </div>
    </aside>
  );
}
