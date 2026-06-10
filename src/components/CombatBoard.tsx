import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useCombatUi, combatUi, advanceTurn } from '../store/useCombatUi';
import type { InitiativeEntry } from '../types/initiative';
import type { Character } from '../types/character';
import { getConditionDef } from '../types/conditions';
import { NumericInput } from './NumericInput';
import { uuid } from '../utils/uuid';

function hpClassFor(pct: number): string {
  if (pct <= 0.25) return 'cb-hp--critical';
  if (pct <= 0.5) return 'cb-hp--bloodied';
  return '';
}

/** Condition chips, shared shape with the sidebar tracker. */
function ConditionChips({ conditions }: { conditions: Character['conditions'] }) {
  return (
    <>
      {conditions.map((cEntry) => {
        const def = getConditionDef(cEntry);
        if (!def) return null;
        const isExh = cEntry.name.startsWith('Exhaustion ');
        const label = isExh ? `EXH${cEntry.name.split(' ')[1]}` : def.abbr;
        const title = cEntry.rounds !== undefined ? `${cEntry.name} (${cEntry.rounds} rnd)` : cEntry.name;
        return (
          <span key={cEntry.name} className="cb-chip cb-chip--cond" title={title}>
            {label}{cEntry.rounds !== undefined ? `·${cEntry.rounds}` : ''}
          </span>
        );
      })}
    </>
  );
}

export function CombatBoard() {
  const {
    characters,
    initiative,
    updateInitiativeEntry,
    removeInitiativeEntry,
    updateCharacter,
    updateEnemyHp,
    removeEnemy,
    addEnemy,
    clearDeadEnemies,
    addInitiativeEntry,
  } = useStore();
  const { activeId, round, boardOpen } = useCombatUi();

  // Reinforcement (add-enemy) form, footer.
  const [npcName, setNpcName] = useState('');
  const [npcInit, setNpcInit] = useState('');
  const [npcCount, setNpcCount] = useState('');
  const [npcMaxHp, setNpcMaxHp] = useState('');
  const [pcId, setPcId] = useState('');

  const usedPcIds = new Set(initiative.filter((e) => e.characterId).map((e) => e.characterId!));
  const availablePCs = characters.filter((c) => !usedPcIds.has(c.id));

  const sorted = [...initiative].sort((a, b) => b.initiative - a.initiative);
  const sortedIds = sorted.map((e) => e.id);
  const activeIdx = sorted.findIndex((e) => e.id === activeId);
  const current = activeIdx >= 0 ? sorted[activeIdx] : null;
  const next = sorted.length > 0 && activeIdx >= 0 ? sorted[(activeIdx + 1) % sorted.length] : null;

  // Keyboard: Esc closes, Space / →  = next turn, ← = previous turn.
  // Ignore when typing in a field so HP edits aren't hijacked.
  useEffect(() => {
    if (!boardOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        combatUi.closeBoard();
      } else if (!typing && (e.code === 'Space' || e.key === 'ArrowRight')) {
        e.preventDefault();
        advanceTurn(sortedIds, 1);
      } else if (!typing && e.key === 'ArrowLeft') {
        e.preventDefault();
        advanceTurn(sortedIds, -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [boardOpen, sortedIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!boardOpen) return null;

  function displayName(entry: InitiativeEntry): string {
    if (entry.characterId) {
      const ch = characters.find((c) => c.id === entry.characterId);
      if (ch) return ch.name || 'Unnamed';
    }
    return entry.name;
  }

  function addAllPCs() {
    for (const ch of availablePCs) {
      addInitiativeEntry({
        id: uuid(),
        name: ch.name || 'Unnamed',
        initiative: 0,
        type: 'pc',
        characterId: ch.id,
      });
    }
  }

  function addOnePC() {
    const ch = characters.find((c) => c.id === pcId);
    if (!ch) return;
    addInitiativeEntry({
      id: uuid(),
      name: ch.name || 'Unnamed',
      initiative: 0,
      type: 'pc',
      characterId: ch.id,
    });
    setPcId('');
  }

  function addReinforcement() {
    const name = npcName.trim();
    if (!name) return;
    const init = parseInt(npcInit, 10) || 0;
    const count = Math.max(1, parseInt(npcCount, 10) || 1);
    const maxHp = parseInt(npcMaxHp, 10) || 0;
    const enemies = maxHp > 0
      ? Array.from({ length: count }, () => ({ id: uuid(), hp: maxHp, maxHp }))
      : undefined;
    addInitiativeEntry({ id: uuid(), name, initiative: init, type: 'npc', enemies });
    setNpcName('');
    setNpcInit('');
    setNpcCount('');
    setNpcMaxHp('');
  }

  return (
    <div className="cb-overlay" onClick={() => combatUi.closeBoard()}>
      <div className="cb-board" onClick={(e) => e.stopPropagation()}>
        {/* ── Command bar ── */}
        <div className="cb-command">
          <div className="cb-command__round">
            <span className="cb-command__round-mark">⚔</span>
            <span className="cb-command__round-num">Round {round}</span>
          </div>

          <div className="cb-command__now">
            <div className="cb-command__slot">
              <span className="cb-command__slot-label">Now</span>
              <span className="cb-command__slot-name">
                {current ? displayName(current) : '—'}
              </span>
            </div>
            <span className="cb-command__arrow">→</span>
            <div className="cb-command__slot cb-command__slot--next">
              <span className="cb-command__slot-label">Next</span>
              <span className="cb-command__slot-name">
                {next ? displayName(next) : '—'}
              </span>
            </div>
          </div>

          <div className="cb-command__actions">
            <button
              className="cb-btn"
              onClick={() => advanceTurn(sortedIds, -1)}
              disabled={activeId === null}
              title="Previous turn (←)"
            >
              ◀ Prev
            </button>
            <button className="cb-btn cb-btn--next" onClick={() => advanceTurn(sortedIds, 1)}>
              {activeId === null ? 'Start Combat' : '▶ Next Turn'}
              <span className="cb-btn__key">Space</span>
            </button>
            <button
              className="cb-btn cb-btn--end"
              onClick={() => combatUi.endCombat()}
              title="End combat (keeps the roster)"
            >
              End
            </button>
          </div>

          <button className="cb-close" onClick={() => combatUi.closeBoard()} title="Close (Esc)">
            ✕
          </button>
        </div>

        {/* ── Card grid ── */}
        {sorted.length > 0 ? (
          <div className="cb-grid">
            {sorted.map((entry) => {
              const isActive = entry.id === activeId;
              const ch = entry.characterId
                ? characters.find((c) => c.id === entry.characterId)
                : undefined;
              const concSpell = ch?.spells?.find((s) => s.active && s.concentration);
              const conditions = ch?.conditions ?? [];
              const enemies = entry.enemies;
              const aliveEnemies = enemies?.filter((e) => e.hp > 0) ?? [];
              const aliveCount = aliveEnemies.length;
              const totalCount = enemies?.length ?? 0;
              const deadCount = totalCount - aliveCount;
              const wiped = enemies && aliveCount === 0;

              return (
                <div
                  key={entry.id}
                  className={
                    'cb-card' +
                    (entry.type === 'npc' ? ' cb-card--npc' : ' cb-card--pc') +
                    (isActive ? ' cb-card--active' : '') +
                    (wiped ? ' cb-card--wiped' : '') +
                    (ch?.dead ? ' cb-card--dead' : '')
                  }
                  onClick={() => combatUi.setActiveId(entry.id)}
                  title="Click to set as the active turn"
                >
                  <div className="cb-card__init" onClick={(e) => e.stopPropagation()}>
                    <NumericInput
                      className="cb-card__init-input"
                      value={entry.initiative}
                      fallback={0}
                      onCommit={(v) => updateInitiativeEntry(entry.id, v)}
                    />
                  </div>

                  <div className="cb-card__body">
                    <div className="cb-card__namerow">
                      <span className="cb-card__name">{displayName(entry)}</span>
                      {enemies ? (
                        <span className={`cb-card__tag${wiped ? ' cb-card__tag--wipe' : ''}`}>
                          {aliveCount}/{totalCount}
                        </span>
                      ) : (
                        <span className="cb-card__tag cb-card__tag--role">
                          {entry.type === 'pc' ? 'PC' : 'NPC'}
                        </span>
                      )}
                      <button
                        className="cb-card__remove"
                        title="Remove from combat"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeId === entry.id) combatUi.setActiveId(null);
                          removeInitiativeEntry(entry.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* PC / single-creature HP — editable current value (live to the sheet) */}
                    {ch && (
                      <div className="cb-pc-hp" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="cb-hp-step"
                          title="−1 HP"
                          onClick={() =>
                            updateCharacter(ch.id, (c) => ({
                              ...c,
                              hp: { ...c.hp, current: Math.max(0, c.hp.current - 1) },
                            }))
                          }
                        >
                          −
                        </button>
                        <div className="cb-hp-track">
                          <div
                            className={`cb-hp-fill ${hpClassFor(ch.hp.max > 0 ? ch.hp.current / ch.hp.max : 0)}`}
                            style={{ width: `${ch.hp.max > 0 ? Math.round((ch.hp.current / ch.hp.max) * 100) : 0}%` }}
                          />
                        </div>
                        <button
                          className="cb-hp-step"
                          title="+1 HP"
                          onClick={() =>
                            updateCharacter(ch.id, (c) => ({
                              ...c,
                              hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + 1) },
                            }))
                          }
                        >
                          +
                        </button>
                        <span className="cb-hp-num">
                          <NumericInput
                            className="cb-hp-input"
                            value={ch.hp.current}
                            fallback={0}
                            onCommit={(v) =>
                              updateCharacter(ch.id, (c) => ({
                                ...c,
                                hp: { ...c.hp, current: Math.max(0, Math.min(c.hp.max, v)) },
                              }))
                            }
                          />
                          /{ch.hp.max}
                          {ch.hp.temp > 0 && <span className="cb-hp-temp"> +{ch.hp.temp}</span>}
                        </span>
                      </div>
                    )}

                    {/* Enemy group — editable HP chips */}
                    {enemies && enemies.length > 0 && (
                      <div className="cb-enemies" onClick={(e) => e.stopPropagation()}>
                        {aliveEnemies.map((en) => {
                          const pct = en.maxHp > 0 ? en.hp / en.maxHp : 0;
                          const origIdx = enemies.indexOf(en);
                          return (
                            <div key={en.id} className={`cb-enemy ${hpClassFor(pct)}`}>
                              <span className="cb-enemy__num">#{origIdx + 1}</span>
                              <button
                                className="cb-hp-step"
                                title="−1 HP"
                                onClick={() => updateEnemyHp(entry.id, en.id, Math.max(0, en.hp - 1))}
                              >
                                −
                              </button>
                              <NumericInput
                                className="cb-enemy__hp"
                                value={en.hp}
                                fallback={0}
                                onCommit={(v) => updateEnemyHp(entry.id, en.id, Math.max(0, Math.min(en.maxHp, v)))}
                              />
                              <span className="cb-enemy__max">/{en.maxHp}</span>
                              <button
                                className="cb-hp-step"
                                title="+1 HP"
                                onClick={() => updateEnemyHp(entry.id, en.id, Math.min(en.maxHp, en.hp + 1))}
                              >
                                +
                              </button>
                              <div className="cb-enemy__track">
                                <div className="cb-enemy__fill" style={{ width: `${Math.round(pct * 100)}%` }} />
                              </div>
                              <button
                                className="cb-enemy__x"
                                title="Remove this one"
                                onClick={() => removeEnemy(entry.id, en.id)}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                        {deadCount > 0 && (
                          <button
                            className="cb-enemy cb-enemy--dead"
                            title="Clear all dead"
                            onClick={() => clearDeadEnemies(entry.id)}
                          >
                            ⊗ {deadCount}
                          </button>
                        )}
                        <button
                          className="cb-enemy cb-enemy--add"
                          title="Add one more"
                          onClick={() => addEnemy(entry.id, enemies[0]?.maxHp ?? 1)}
                        >
                          +
                        </button>
                      </div>
                    )}

                    {(conditions.length > 0 || concSpell) && (
                      <div className="cb-card__chips">
                        <ConditionChips conditions={conditions} />
                        {concSpell && (
                          <span className="cb-chip cb-chip--conc" title={`Concentrating: ${concSpell.name}`}>
                            ◎ {concSpell.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="cb-empty">
            <p className="cb-empty__title">No combatants yet.</p>
            {availablePCs.length > 0 && (
              <button className="cb-btn cb-btn--next" onClick={addAllPCs}>
                + Add All Party
              </button>
            )}
            <span className="cb-empty__hint">…then add enemies in the bar below.</span>
          </div>
        )}

        {/* ── Footer: add combatants ── */}
        <div className="cb-footer">
          {availablePCs.length > 0 && (
            <>
              <span className="cb-footer__label">Party</span>
              <button className="cb-footer__add" onClick={addAllPCs}>
                + Add All
              </button>
              <select
                className="cb-footer__select"
                value={pcId}
                onChange={(e) => setPcId(e.target.value)}
              >
                <option value="">Add PC…</option>
                {availablePCs.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name || 'Unnamed'}
                  </option>
                ))}
              </select>
              <button className="cb-footer__add" onClick={addOnePC} disabled={!pcId}>
                Add
              </button>
              <span className="cb-footer__divider" />
            </>
          )}
          <span className="cb-footer__label">Reinforcements</span>
          <input
            type="text"
            className="cb-footer__name"
            placeholder="Enemy name…"
            value={npcName}
            onChange={(e) => setNpcName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReinforcement()}
          />
          <input
            type="number"
            className="cb-footer__num"
            placeholder="Init"
            value={npcInit}
            onChange={(e) => setNpcInit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReinforcement()}
          />
          <span className="cb-footer__sym">×</span>
          <input
            type="number"
            className="cb-footer__num"
            placeholder="1"
            min={1}
            value={npcCount}
            onChange={(e) => setNpcCount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReinforcement()}
          />
          <span className="cb-footer__sym">HP</span>
          <input
            type="number"
            className="cb-footer__num"
            placeholder="—"
            min={1}
            value={npcMaxHp}
            onChange={(e) => setNpcMaxHp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReinforcement()}
          />
          <button className="cb-footer__add" onClick={addReinforcement} disabled={!npcName.trim()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
