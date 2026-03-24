import { useSyncExternalStore, useCallback } from 'react';
import { type Character, createCharacter } from '../types/character';
import { type InitiativeEntry } from '../types/initiative';
import { type PartyExport } from '../utils/importExport';
import { uuid } from '../utils/uuid';
import { isPlayerMode, broadcastState, onStateReceived } from './wsClient';
import seedData from '../../our_party_setup_seed.json';

const STORAGE_KEY = 'phandaLedger_state';

interface AppState {
  characters: Character[];
  selectedId: string | null;
  initiative: InitiativeEntry[];
}

// ── Persistent store with subscribe/getSnapshot for useSyncExternalStore ──

let state: AppState = { characters: [], selectedId: null, initiative: [] };
let listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota errors, etc */ }
}

function migrateState(parsed: AppState): AppState {
  const template = createCharacter();
  parsed.characters.forEach((ch) => {
    for (const key of Object.keys(template) as (keyof Character)[]) {
      if (!(key in ch)) {
        (ch as unknown as Record<string, unknown>)[key] = template[key];
      }
    }
    ch.inventory = (ch.inventory || []).map((item) => {
      const raw = item as unknown as Record<string, unknown>;
      return { equipped: false, modifiers: [], ...raw } as unknown as typeof item;
    });
    if (!ch.conditions) {
      (ch as unknown as Record<string, unknown>).conditions = [];
    } else {
      ch.conditions = (ch.conditions as unknown[]).map((c) =>
        typeof c === 'string' ? { name: c } : c
      ) as typeof ch.conditions;
    }
    ch.spells = (ch.spells || []).map((s) => {
      const raw = s as unknown as Record<string, unknown>;
      return {
        concentration: false, duration: '', durationRounds: 0,
        castingTime: '1 action', notes: '', description: '', prepared: true, alwaysPrepared: false, active: false, roundsRemaining: 0,
        ...raw,
      } as unknown as typeof s;
    });
    ch.weapons = (ch.weapons || []).map((w) => {
      const raw = w as unknown as Record<string, unknown>;
      return { versatile: false, versatileDice: '', twoHanded: false, proficient: true, ranged: false, ...raw } as unknown as typeof w;
    });
    ch.resources = (ch.resources || []).map((r) => {
      const raw = r as unknown as Record<string, unknown>;
      return { description: '', ...raw } as unknown as typeof r;
    });
  });
  if (!parsed.initiative) parsed.initiative = [];
  return parsed;
}

function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = migrateState(JSON.parse(raw) as AppState);
    } else {
      state = migrateState(seedData as unknown as AppState);
      persist();
    }
  } catch { /* corrupted data, start fresh */ }
}

// Initial load — players skip localStorage and wait for WS state instead
if (!isPlayerMode) {
  hydrate();
  // Queue the hydrated state to be sent as soon as the WS connection opens.
  // This ensures players who connect after the DM's tab loads get the full
  // party immediately, without requiring the DM to make any edits first.
  broadcastState(state);
} else {
  // Register WS listener: incoming state from the server overwrites local state.
  // Migration is applied so schema changes are handled gracefully.
  onStateReceived((incoming) => {
    const migrated = migrateState(incoming as AppState);
    // Preserve the player's own character selection if that character still exists.
    // Fall back to the first character if they have no selection yet.
    const currentId = state.selectedId;
    const stillExists = currentId && migrated.characters.some((c) => c.id === currentId);
    state = {
      ...migrated,
      selectedId: stillExists ? currentId : migrated.characters[0]?.id ?? null,
    };
    emit();
  });
}

function getSnapshot(): AppState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── Mutations ──

function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  if (!isPlayerMode) {
    persist();
    // Omit selectedId — players manage their own navigation independently.
    const { selectedId: _omit, ...broadcastable } = state;
    broadcastState(broadcastable);
  }
  emit();
}

function updateCharacter(id: string, updater: (ch: Character) => Character) {
  setState((prev) => ({
    ...prev,
    characters: prev.characters.map((ch) =>
      ch.id === id ? updater({ ...ch }) : ch
    ),
  }));
}

// ── Hook ──

export function useStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  const selected = snap.characters.find((c) => c.id === snap.selectedId) ?? null;

  const addCharacter = useCallback(() => {
    const ch = createCharacter();
    setState((prev) => ({
      ...prev,
      characters: [...prev.characters, ch],
      selectedId: ch.id,
    }));
    return ch.id;
  }, []);

  const removeCharacter = useCallback((id: string) => {
    setState((prev) => {
      const filtered = prev.characters.filter((c) => c.id !== id);
      return {
        ...prev,
        characters: filtered,
        selectedId:
          prev.selectedId === id
            ? filtered[0]?.id ?? null
            : prev.selectedId,
      };
    });
  }, []);

  const selectCharacter = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedId: id }));
  }, []);

  const updateSelected = useCallback(
    (updater: (ch: Character) => Character) => {
      if (snap.selectedId) {
        updateCharacter(snap.selectedId, updater);
      }
    },
    [snap.selectedId]
  );

  const shortRest = useCallback(() => {
    if (!snap.selectedId) return;
    updateCharacter(snap.selectedId, (c) => {
      if (c.shortRestsUsed >= 2) return c;
      return {
        ...c,
        shortRestsUsed: c.shortRestsUsed + 1,
        resources: c.resources.map((r) =>
          r.recharge === 'short' ? { ...r, used: 0 } : r
        ),
      };
    });
  }, [snap.selectedId]);

  const longRest = useCallback((label: string, timestamp: number) => {
    if (!snap.selectedId) return;
    updateCharacter(snap.selectedId, (c) => ({
      ...c,
      shortRestsUsed: 0,
      lastLongRestAt: label,
      lastLongRestTimestamp: timestamp,
      spellSlots: c.spellSlots.map((s) => ({ ...s, used: 0 })),
      resources: c.resources.map((r) =>
        r.recharge !== 'manual' ? { ...r, used: 0 } : r
      ),
    }));
  }, [snap.selectedId]);

  const shortRestAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      characters: prev.characters.map((c) =>
        c.shortRestsUsed >= 2 ? c : {
          ...c,
          shortRestsUsed: c.shortRestsUsed + 1,
          resources: c.resources.map((r) =>
            r.recharge === 'short' ? { ...r, used: 0 } : r
          ),
        }
      ),
    }));
  }, []);

  const shortRestWithHP = useCallback((hpGain: number) => {
    if (!snap.selectedId) return;
    updateCharacter(snap.selectedId, (c) => {
      if (c.shortRestsUsed >= 2) return c;
      return {
        ...c,
        hp: { ...c.hp, current: Math.min(c.hp.current + hpGain, c.hp.max) },
        shortRestsUsed: c.shortRestsUsed + 1,
        resources: c.resources.map((r) =>
          r.recharge === 'short' ? { ...r, used: 0 } : r
        ),
      };
    });
  }, [snap.selectedId]);

  const shortRestAllWithHP = useCallback((hpGains: Record<string, number>) => {
    setState((prev) => ({
      ...prev,
      characters: prev.characters.map((c) =>
        c.shortRestsUsed >= 2 ? c : {
          ...c,
          hp: { ...c.hp, current: Math.min(c.hp.current + (hpGains[c.id] ?? 0), c.hp.max) },
          shortRestsUsed: c.shortRestsUsed + 1,
          resources: c.resources.map((r) =>
            r.recharge === 'short' ? { ...r, used: 0 } : r
          ),
        }
      ),
    }));
  }, []);

  const longRestAll = useCallback((label: string, timestamp: number) => {
    setState((prev) => ({
      ...prev,
      characters: prev.characters.map((c) => ({
        ...c,
        shortRestsUsed: 0,
        lastLongRestAt: label,
        lastLongRestTimestamp: timestamp,
        spellSlots: c.spellSlots.map((s) => ({ ...s, used: 0 })),
        resources: c.resources.map((r) =>
          r.recharge !== 'manual' ? { ...r, used: 0 } : r
        ),
      })),
    }));
  }, []);

  const replaceParty = useCallback((exported: PartyExport) => {
    const { characters, selectedId } = exported;
    const safeSelectedId = characters.find((c) => c.id === selectedId)
      ? selectedId
      : characters[0]?.id ?? null;
    setState(() => ({ characters, selectedId: safeSelectedId, initiative: [] }));
  }, []);

  // Merge incoming characters into the existing party.
  // Characters with a matching ID are updated in-place; new IDs are appended.
  // Selects the first incoming character after merging.
  const mergeCharacters = useCallback((incoming: Character[]) => {
    setState((prev) => {
      const incomingIds = new Set(incoming.map((c) => c.id));
      const kept = prev.characters.filter((c) => !incomingIds.has(c.id));
      const merged = [...kept, ...incoming];
      return {
        ...prev,
        characters: merged,
        selectedId: incoming[0]?.id ?? prev.selectedId,
      };
    });
  }, []);

  // ── Initiative mutations ──

  const addInitiativeEntry = useCallback((entry: InitiativeEntry) => {
    setState((prev) => ({ ...prev, initiative: [...prev.initiative, entry] }));
  }, []);

  const removeInitiativeEntry = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      initiative: prev.initiative.filter((e) => e.id !== id),
    }));
  }, []);

  const updateInitiativeEntry = useCallback((id: string, initiative: number) => {
    setState((prev) => ({
      ...prev,
      initiative: prev.initiative.map((e) =>
        e.id === id ? { ...e, initiative } : e
      ),
    }));
  }, []);

  const clearInitiative = useCallback(() => {
    setState((prev) => ({ ...prev, initiative: [] }));
  }, []);

  const updateEnemyHp = useCallback((entryId: string, enemyId: string, hp: number) => {
    setState((prev) => ({
      ...prev,
      initiative: prev.initiative.map((e) =>
        e.id === entryId
          ? { ...e, enemies: e.enemies?.map((en) => en.id === enemyId ? { ...en, hp } : en) }
          : e
      ),
    }));
  }, []);

  const removeEnemy = useCallback((entryId: string, enemyId: string) => {
    setState((prev) => ({
      ...prev,
      initiative: prev.initiative.map((e) =>
        e.id === entryId
          ? { ...e, enemies: e.enemies?.filter((en) => en.id !== enemyId) }
          : e
      ),
    }));
  }, []);

  const addEnemy = useCallback((entryId: string, maxHp: number) => {
    setState((prev) => ({
      ...prev,
      initiative: prev.initiative.map((e) =>
        e.id === entryId
          ? { ...e, enemies: [...(e.enemies ?? []), { id: uuid(), hp: maxHp, maxHp }] }
          : e
      ),
    }));
  }, []);

  const clearDeadEnemies = useCallback((entryId: string) => {
    setState((prev) => ({
      ...prev,
      initiative: prev.initiative.map((e) =>
        e.id === entryId
          ? { ...e, enemies: e.enemies?.filter((en) => en.hp > 0) }
          : e
      ),
    }));
  }, []);

  const transferItem = useCallback((fromCharId: string, toCharId: string, itemId: string) => {
    setState((prev) => {
      const fromChar = prev.characters.find((c) => c.id === fromCharId);
      if (!fromChar) return prev;
      const item = fromChar.inventory.find((i) => i.id === itemId);
      if (!item) return prev;
      return {
        ...prev,
        characters: prev.characters.map((c) => {
          if (c.id === fromCharId) {
            return { ...c, inventory: c.inventory.filter((i) => i.id !== itemId) };
          }
          if (c.id === toCharId) {
            return { ...c, inventory: [...c.inventory, { ...item, id: uuid(), equipped: false }] };
          }
          return c;
        }),
      };
    });
  }, []);

  return {
    characters: snap.characters,
    selectedId: snap.selectedId,
    selected,
    initiative: snap.initiative,
    addCharacter,
    removeCharacter,
    selectCharacter,
    updateSelected,
    transferItem,
    shortRest,
    longRest,
    shortRestAll,
    longRestAll,
    shortRestWithHP,
    shortRestAllWithHP,
    replaceParty,
    mergeCharacters,
    addInitiativeEntry,
    removeInitiativeEntry,
    updateInitiativeEntry,
    clearInitiative,
    updateEnemyHp,
    removeEnemy,
    addEnemy,
    clearDeadEnemies,
  };
}
