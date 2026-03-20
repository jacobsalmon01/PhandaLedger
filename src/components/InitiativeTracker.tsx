import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { InitiativeEntry } from '../types/initiative';
import { NumericInput } from './NumericInput';
import { getConditionDef } from '../types/conditions';

export function InitiativeTracker() {
  const {
    characters,
    initiative,
    addInitiativeEntry,
    removeInitiativeEntry,
    updateInitiativeEntry,
    clearInitiative,
    updateEnemyHp,
    removeEnemy,
    addEnemy,
    clearDeadEnemies,
  } = useStore();

  const [expanded, setExpanded] = useState(initiative.length > 0);
  const [npcName, setNpcName] = useState('');
  const [npcInit, setNpcInit] = useState('');
  const [npcCount, setNpcCount] = useState('');
  const [npcMaxHp, setNpcMaxHp] = useState('');
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
    const count = Math.max(1, parseInt(npcCount, 10) || 1);
    const maxHp = parseInt(npcMaxHp, 10) || 0;
    const enemies = maxHp > 0
      ? Array.from({ length: count }, () => ({
          id: crypto.randomUUID(),
          hp: maxHp,
          maxHp,
        }))
      : undefined;
    addInitiativeEntry({
      id: crypto.randomUUID(),
      name,
      initiative: init,
      type: 'npc',
      enemies,
    });
    setNpcName('');
    setNpcInit('');
    setNpcCount('');
    setNpcMaxHp('');
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
                const ch = entry.characterId
                  ? characters.find((c) => c.id === entry.characterId)
                  : undefined;
                const concSpell = ch?.spells?.find((s) => s.active && s.concentration);
                const activeConditions = ch?.conditions ?? [];
                const enemies = entry.enemies;
                const aliveEnemies = enemies?.filter((e) => e.hp > 0) ?? [];
                const deadCount = (enemies?.length ?? 0) - aliveEnemies.length;
                const aliveCount = aliveEnemies.length;
                const aliveClass = enemies
                  ? aliveCount === 0
                    ? ' init-row__alive--wipe'
                    : aliveCount <= Math.ceil(enemies.length / 2)
                    ? ' init-row__alive--warn'
                    : ''
                  : '';
                return (
                  <div
                    key={entry.id}
                    className={`init-row${entry.type === 'npc' ? ' init-row--npc' : ''}${isActive ? ' init-row--active' : ''}`}
                  >
                    {/* ── Main row ── */}
                    <div className="init-row__main">
                      <NumericInput
                        className="init-row__value"
                        value={entry.initiative}
                        fallback={0}
                        onCommit={(v) => updateInitiativeEntry(entry.id, v)}
                      />
                      <span className="init-row__name">{displayName(entry)}</span>
                      {enemies && (
                        <span className={`init-row__alive${aliveClass}`} title={`${aliveCount} of ${enemies.length} alive`}>
                          {aliveCount}/{enemies.length}
                        </span>
                      )}
                      {activeConditions.map((cEntry) => {
                        const def = getConditionDef(cEntry);
                        if (!def) return null;
                        const isExh = cEntry.name.startsWith('Exhaustion ');
                        const label = isExh ? `EXH${cEntry.name.split(' ')[1]}` : def.abbr;
                        const title = cEntry.rounds !== undefined ? `${cEntry.name} (${cEntry.rounds} rnd)` : cEntry.name;
                        return (
                          <span
                            key={cEntry.name}
                            className="init-row__cond"
                            title={title}
                          >
                            {label}{cEntry.rounds !== undefined ? `·${cEntry.rounds}` : ''}
                          </span>
                        );
                      })}
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

                    {/* ── Enemy HP panel ── */}
                    {enemies && enemies.length > 0 && (
                      <div className="init-row__enemies">
                        {aliveEnemies.map((en) => {
                          const pct = en.maxHp > 0 ? en.hp / en.maxHp : 0;
                          const hpClass =
                            pct <= 0.25
                              ? 'enemy-chip--critical'
                              : pct <= 0.5
                              ? 'enemy-chip--bloodied'
                              : '';
                          // Original index across full enemies array for stable numbering
                          const origIdx = enemies.indexOf(en);
                          return (
                            <div
                              key={en.id}
                              className={`enemy-chip${hpClass ? ` ${hpClass}` : ''}`}
                            >
                              <span className="enemy-chip__num">#{origIdx + 1}</span>
                              <div className="enemy-chip__hprow">
                                <NumericInput
                                  className="enemy-chip__hp"
                                  value={en.hp}
                                  fallback={0}
                                  onCommit={(v) => updateEnemyHp(entry.id, en.id, Math.max(0, v))}
                                />
                                <span className="enemy-chip__max">/{en.maxHp}</span>
                              </div>
                              <div className="enemy-chip__bar-track">
                                <div
                                  className="enemy-chip__bar-fill"
                                  style={{ width: `${Math.round(pct * 100)}%` }}
                                />
                              </div>
                              <button
                                className="enemy-chip__remove"
                                title="Remove enemy"
                                onClick={() => removeEnemy(entry.id, en.id)}
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                        {deadCount > 0 && (
                          <button
                            className="enemy-chip enemy-chip--dead-badge"
                            title="Clear all dead enemies"
                            onClick={() => clearDeadEnemies(entry.id)}
                          >
                            <span className="enemy-chip__dead-x">⊗</span>
                            <span className="enemy-chip__dead-count">{deadCount}</span>
                          </button>
                        )}
                        <button
                          className="enemy-chip enemy-chip--add"
                          title="Add another enemy"
                          onClick={() => addEnemy(entry.id, enemies[0]?.maxHp ?? 1)}
                        >
                          +
                        </button>
                      </div>
                    )}
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
          <div className="init-npc-form">
            <div className="init-npc-form__top">
              <input
                type="text"
                className="init-npc-form__name"
                placeholder="Enemy name…"
                value={npcName}
                onChange={(e) => setNpcName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNPC()}
              />
              <input
                type="number"
                className="init-npc-form__init"
                placeholder="Init"
                value={npcInit}
                onChange={(e) => setNpcInit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNPC()}
              />
            </div>
            <div className="init-npc-form__bottom">
              <span className="init-npc-form__sym">×</span>
              <input
                type="number"
                className="init-npc-form__count"
                placeholder="1"
                min={1}
                value={npcCount}
                onChange={(e) => setNpcCount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNPC()}
              />
              <span className="init-npc-form__sym init-npc-form__sym--hp">HP</span>
              <input
                type="number"
                className="init-npc-form__hp"
                placeholder="—"
                min={1}
                value={npcMaxHp}
                onChange={(e) => setNpcMaxHp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNPC()}
              />
              <button
                className="init-npc-form__spawn"
                onClick={addNPC}
                disabled={!npcName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
