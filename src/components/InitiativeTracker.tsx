import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { InitiativeEntry } from '../types/initiative';
import { NumericInput } from './NumericInput';

export function InitiativeTracker() {
  const {
    characters,
    initiative,
    addInitiativeEntry,
    removeInitiativeEntry,
    updateInitiativeEntry,
    clearInitiative,
  } = useStore();

  const [expanded, setExpanded] = useState(initiative.length > 0);
  const [npcName, setNpcName] = useState('');
  const [npcInit, setNpcInit] = useState('');
  const [pcId, setPcId] = useState('');
  const [pcInit, setPcInit] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sorted = [...initiative].sort((a, b) => b.initiative - a.initiative);

  const usedPcIds = new Set(
    initiative.filter((e) => e.characterId).map((e) => e.characterId!)
  );
  const availablePCs = characters.filter((c) => !usedPcIds.has(c.id));

  function addNPC() {
    const name = npcName.trim();
    if (!name) return;
    const init = parseInt(npcInit, 10) || 0;
    addInitiativeEntry({
      id: crypto.randomUUID(),
      name,
      initiative: init,
      type: 'npc',
    });
    setNpcName('');
    setNpcInit('');
  }

  function addPC() {
    const ch = characters.find((c) => c.id === pcId);
    if (!ch) return;
    const init = parseInt(pcInit, 10) || 0;
    addInitiativeEntry({
      id: crypto.randomUUID(),
      name: ch.name || 'Unnamed',
      initiative: init,
      type: 'pc',
      characterId: ch.id,
    });
    setPcId('');
    setPcInit('');
  }

  function addAllPCs() {
    for (const ch of availablePCs) {
      addInitiativeEntry({
        id: crypto.randomUUID(),
        name: ch.name || 'Unnamed',
        initiative: 0,
        type: 'pc',
        characterId: ch.id,
      });
    }
  }

  function handleReset() {
    clearInitiative();
    setActiveId(null);
  }

  function nextTurn() {
    if (sorted.length === 0) return;
    if (activeId === null) {
      setActiveId(sorted[0].id);
      return;
    }
    const idx = sorted.findIndex((e) => e.id === activeId);
    const nextIdx = (idx + 1) % sorted.length;
    setActiveId(sorted[nextIdx].id);
  }

  function displayName(entry: InitiativeEntry): string {
    if (entry.characterId) {
      const ch = characters.find((c) => c.id === entry.characterId);
      if (ch) return ch.name || 'Unnamed';
    }
    return entry.name;
  }

  const activeIdx = sorted.findIndex((e) => e.id === activeId);

  return (
    <div className="init-tracker">
      <button
        className="init-tracker__header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="init-tracker__chevron">{expanded ? '▾' : '▸'}</span>
        <span className="init-tracker__title">Initiative</span>
        {initiative.length > 0 && (
          <span className="init-tracker__count">{initiative.length}</span>
        )}
        {activeId !== null && (
          <span className="init-tracker__active-badge">
            {activeIdx + 1}/{sorted.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="init-tracker__body">
          {/* ── Sorted initiative list ── */}
          {sorted.length > 0 ? (
            <div className="init-list">
              {sorted.map((entry) => {
                const isActive = entry.id === activeId;
                const concSpell = entry.characterId
                  ? characters.find((c) => c.id === entry.characterId)
                      ?.spells?.find((s) => s.active && s.concentration)
                  : undefined;
                return (
                  <div
                    key={entry.id}
                    className={`init-row${entry.type === 'npc' ? ' init-row--npc' : ''}${isActive ? ' init-row--active' : ''}`}
                  >
                    <NumericInput
                      className="init-row__value"
                      value={entry.initiative}
                      fallback={0}
                      onCommit={(v) => updateInitiativeEntry(entry.id, v)}
                    />
                    <span className="init-row__name">{displayName(entry)}</span>
                    {concSpell && (
                      <span
                        className="init-row__conc"
                        title={`Concentrating: ${concSpell.name}`}
                      >
                        ◎
                      </span>
                    )}
                    <button
                      className="init-row__remove"
                      title="Remove"
                      onClick={() => {
                        if (activeId === entry.id) setActiveId(null);
                        removeInitiativeEntry(entry.id);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="init-empty">No combatants. Add the party or NPCs below.</div>
          )}

          {/* ── Turn controls ── */}
          {sorted.length > 0 && (
            <div className="init-turn-controls">
              <button className="init-btn init-btn--next" onClick={nextTurn}>
                {activeId === null ? 'Start Combat' : 'Next Turn'}
              </button>
              <button className="init-btn init-btn--reset" onClick={handleReset}>
                End
              </button>
            </div>
          )}

          {/* ── Add All PCs ── */}
          {availablePCs.length > 0 && (
            <div className="init-add-section">
              <button
                className="init-btn init-btn--add-all"
                onClick={addAllPCs}
              >
                + Add All Party Members
              </button>
            </div>
          )}

          {/* ── Add individual PC ── */}
          {availablePCs.length > 0 && (
            <div className="init-add-section">
              <span className="init-add-label">Add Individual</span>
              <div className="init-add-row">
                <select
                  className="init-select"
                  value={pcId}
                  onChange={(e) => setPcId(e.target.value)}
                >
                  <option value="">Select PC…</option>
                  {availablePCs.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="init-input init-input--num"
                  placeholder="Init"
                  value={pcInit}
                  onChange={(e) => setPcInit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPC()}
                />
                <button
                  className="init-btn init-btn--add"
                  onClick={addPC}
                  disabled={!pcId}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* ── Add NPC ── */}
          <div className="init-add-section">
            <span className="init-add-label">Add NPC / Enemy</span>
            <div className="init-add-row">
              <input
                type="text"
                className="init-input init-input--name"
                placeholder="Name…"
                value={npcName}
                onChange={(e) => setNpcName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNPC()}
              />
              <input
                type="number"
                className="init-input init-input--num"
                placeholder="Init"
                value={npcInit}
                onChange={(e) => setNpcInit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNPC()}
              />
              <button
                className="init-btn init-btn--add"
                onClick={addNPC}
                disabled={!npcName.trim()}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
