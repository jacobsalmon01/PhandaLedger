import { useSyncExternalStore, useCallback } from 'react';
import { type Character, createCharacter } from '../types/character';
import { type PartyExport } from '../utils/importExport';

const STORAGE_KEY = 'phandaLedger_state';

interface AppState {
  characters: Character[];
  selectedId: string | null;
}

// ── Persistent store with subscribe/getSnapshot for useSyncExternalStore ──

let state: AppState = { characters: [], selectedId: null };
let listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota errors, etc */ }
}

function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Migration: fill in any missing fields on each character
      const template = createCharacter();
      parsed.characters.forEach((ch) => {
        for (const key of Object.keys(template) as (keyof Character)[]) {
          if (!(key in ch)) {
            (ch as unknown as Record<string, unknown>)[key] = template[key];
          }
        }
      });
      state = parsed;
    }
  } catch { /* corrupted data, start fresh */ }
}

// Initial load
hydrate();

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
  persist();
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

  /**
   * Replaces the entire party with the contents of a validated PartyExport.
   * Preserves selectedId if the character still exists, otherwise selects
   * the first character in the imported roster.
   */
  const replaceParty = useCallback((exported: PartyExport) => {
    const { characters, selectedId } = exported;
    const safeSelectedId = characters.find((c) => c.id === selectedId)
      ? selectedId
      : characters[0]?.id ?? null;
    setState(() => ({ characters, selectedId: safeSelectedId }));
  }, []);

  return {
    characters: snap.characters,
    selectedId: snap.selectedId,
    selected,
    addCharacter,
    removeCharacter,
    selectCharacter,
    updateSelected,
    shortRest,
    longRest,
    replaceParty,
  };
}
