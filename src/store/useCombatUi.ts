/**
 * Ephemeral combat-turn UI state for the full-screen CombatBoard overlay
 * (opened from the sidebar's Combat Board launcher button).
 *
 * Deliberately NOT part of AppState: it is not persisted to localStorage and not
 * broadcast to players — it's the DM's local "whose turn is it" + round counter,
 * plus whether the board overlay is open. Uses the same useSyncExternalStore
 * pattern as the main store (no external state library).
 */

import { useSyncExternalStore } from 'react';

interface CombatUiState {
  activeId: string | null; // id of the InitiativeEntry whose turn it is
  round: number; // combat round, starts at 1
  boardOpen: boolean; // is the full-screen board overlay showing
}

let state: CombatUiState = { activeId: null, round: 1, boardOpen: false };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(patch: Partial<CombatUiState>) {
  state = { ...state, ...patch };
  emit();
}

/** Move the active turn forward (dir 1) or backward (dir -1) through `sortedIds`. */
export function advanceTurn(sortedIds: string[], dir: 1 | -1) {
  if (sortedIds.length === 0) return;
  // No active combatant yet → combat begins on the first in order, round 1.
  if (state.activeId === null) {
    set({ activeId: sortedIds[0] });
    return;
  }
  const idx = sortedIds.indexOf(state.activeId);
  if (idx === -1) {
    // Active combatant was removed — restart at the top.
    set({ activeId: sortedIds[0] });
    return;
  }
  let nextIdx = idx + dir;
  let nextRound = state.round;
  if (nextIdx >= sortedIds.length) {
    nextIdx = 0;
    nextRound = state.round + 1;
  } else if (nextIdx < 0) {
    nextIdx = sortedIds.length - 1;
    nextRound = Math.max(1, state.round - 1);
  }
  set({ activeId: sortedIds[nextIdx], round: nextRound });
}

export const combatUi = {
  setActiveId: (id: string | null) => set({ activeId: id }),
  openBoard: () => set({ boardOpen: true }),
  closeBoard: () => set({ boardOpen: false }),
  /** End combat: clear the active turn and reset the round (does not touch the roster). */
  endCombat: () => set({ activeId: null, round: 1, boardOpen: false }),
};

export function useCombatUi(): CombatUiState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
