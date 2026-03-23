import { useSyncExternalStore, useCallback } from 'react';
import type { MapToken, MapTemplate } from '../types/battlemap';
import { uuid } from '../utils/uuid';
import {
  isPlayerMode,
  broadcastBattleMap,
  broadcastBattleMapImage,
  broadcastBattleMapClear,
  onBattleMapReceived,
  onBattleMapImageReceived,
  onBattleMapCleared,
} from './wsClient';

const STORAGE_KEY = 'phandaLedger_battleMap';

interface BattleMapState {
  mapImage: string | null;
  tokens: MapToken[];
  templates: MapTemplate[];
  gridCellSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridVisible: boolean;
  gridColor: string;
  fogEnabled: boolean;
  fogRevealed: string[];  // Set of "col,row" keys for revealed cells
}

const DEFAULTS: BattleMapState = {
  mapImage: null,
  tokens: [],
  templates: [],
  gridCellSize: 70,
  gridOffsetX: 0,
  gridOffsetY: 0,
  gridVisible: true,
  gridColor: '#ffdc64',
  fogEnabled: false,
  fogRevealed: [],
};

let state: BattleMapState = { ...DEFAULTS };
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

function metaOnly() {
  const { tokens, templates, gridCellSize, gridOffsetX, gridOffsetY, gridVisible, gridColor, fogEnabled, fogRevealed } = state;
  return { tokens, templates, gridCellSize, gridOffsetX, gridOffsetY, gridVisible, gridColor, fogEnabled, fogRevealed };
}

function persist() {
  if (isPlayerMode) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metaOnly()));
  } catch { /* quota */ }
}

// ── IndexedDB for map image ──────────────────────────────────────────────────

const DB_NAME = 'phandaLedger';
const IMG_STORE = 'battleMapImages';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IMG_STORE)) {
        req.result.createObjectStore(IMG_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveImage(dataUrl: string) {
  try {
    const db = await openDB();
    db.transaction(IMG_STORE, 'readwrite').objectStore(IMG_STORE).put(dataUrl, 'current');
  } catch { /* */ }
}

async function loadImage(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction(IMG_STORE, 'readonly').objectStore(IMG_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function deleteImage() {
  try {
    const db = await openDB();
    db.transaction(IMG_STORE, 'readwrite').objectStore(IMG_STORE).delete('current');
  } catch { /* */ }
}

// ── Hydration ────────────────────────────────────────────────────────────────

if (!isPlayerMode) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const meta = JSON.parse(raw);
      state = { ...DEFAULTS, ...meta, mapImage: null };
    }
  } catch { /* */ }

  // Load image from IndexedDB (async) and queue for WS broadcast
  loadImage().then((img) => {
    if (img) {
      state = { ...state, mapImage: img };
      emit();
      broadcastBattleMapImage(img);
    }
  });

  // Queue initial metadata broadcast
  broadcastBattleMap(metaOnly());
}

// ── Player WS listeners ──────────────────────────────────────────────────────

if (isPlayerMode) {
  onBattleMapReceived((incoming: unknown) => {
    const data = incoming as Omit<BattleMapState, 'mapImage'>;
    state = { ...state, ...data };
    emit();
  });
  onBattleMapImageReceived((dataUrl: string) => {
    state = { ...state, mapImage: dataUrl };
    emit();
  });
  onBattleMapCleared(() => {
    state = { ...DEFAULTS };
    emit();
  });
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

function getSnapshot(): BattleMapState { return state; }

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// ── Mutations ────────────────────────────────────────────────────────────────

function _broadcastMeta() {
  if (isPlayerMode) return;
  broadcastBattleMap(metaOnly());
}

function _setMapImage(dataUrl: string) {
  state = { ...state, mapImage: dataUrl, fogEnabled: false, fogRevealed: [] };
  persist();
  if (!isPlayerMode) {
    saveImage(dataUrl);
    broadcastBattleMapImage(dataUrl);
    _broadcastMeta();
  }
  emit();
}

function _addToken(token: Omit<MapToken, 'id'>) {
  state = { ...state, tokens: [...state.tokens, { ...token, id: uuid() }] };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _moveToken(id: string, col: number, row: number) {
  state = { ...state, tokens: state.tokens.map((t) => t.id === id ? { ...t, col, row } : t) };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _removeToken(id: string) {
  state = { ...state, tokens: state.tokens.filter((t) => t.id !== id) };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _addTemplate(template: Omit<MapTemplate, 'id'>) {
  state = { ...state, templates: [...state.templates, { ...template, id: uuid() }] };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _updateTemplate(id: string, updates: Partial<Omit<MapTemplate, 'id'>>) {
  state = { ...state, templates: state.templates.map((t) => t.id === id ? { ...t, ...updates } : t) };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _removeTemplate(id: string) {
  state = { ...state, templates: state.templates.filter((t) => t.id !== id) };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _updateGrid(updates: Partial<Pick<BattleMapState, 'gridCellSize' | 'gridOffsetX' | 'gridOffsetY' | 'gridVisible' | 'gridColor'>>) {
  state = { ...state, ...updates };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _setFogEnabled(enabled: boolean) {
  if (isPlayerMode) return;
  state = { ...state, fogEnabled: enabled };
  persist();
  _broadcastMeta();
  emit();
}

function _revealFog(cells: string[]) {
  if (isPlayerMode) return;
  const set = new Set(state.fogRevealed);
  for (const c of cells) set.add(c);
  state = { ...state, fogRevealed: [...set] };
  persist();
  _broadcastMeta();
  emit();
}

function _coverFog(cells: string[]) {
  if (isPlayerMode) return;
  const set = new Set(state.fogRevealed);
  for (const c of cells) set.delete(c);
  state = { ...state, fogRevealed: [...set] };
  persist();
  _broadcastMeta();
  emit();
}

function _clearMap() {
  state = { ...DEFAULTS };
  persist();
  if (!isPlayerMode) {
    deleteImage();
    broadcastBattleMapClear();
  }
  emit();
}

// ── Import / Export ──────────────────────────────────────────────────────────

export type BattleMapExport = ReturnType<typeof metaOnly>;

export function getBattleMapExport(): BattleMapExport {
  return metaOnly();
}

export function loadBattleMapExport(data: BattleMapExport) {
  state = { ...DEFAULTS, ...data, mapImage: state.mapImage };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBattleMapStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  return {
    mapImage: snap.mapImage,
    tokens: snap.tokens,
    templates: snap.templates,
    gridCellSize: snap.gridCellSize,
    gridOffsetX: snap.gridOffsetX,
    gridOffsetY: snap.gridOffsetY,
    gridVisible: snap.gridVisible,
    gridColor: snap.gridColor,
    fogEnabled: snap.fogEnabled,
    fogRevealed: snap.fogRevealed,
    setMapImage:      useCallback((url: string) => _setMapImage(url), []),
    addToken:         useCallback((t: Omit<MapToken, 'id'>) => _addToken(t), []),
    moveToken:        useCallback((id: string, col: number, row: number) => _moveToken(id, col, row), []),
    removeToken:      useCallback((id: string) => _removeToken(id), []),
    addTemplate:      useCallback((t: Omit<MapTemplate, 'id'>) => _addTemplate(t), []),
    updateTemplate:   useCallback((id: string, u: Partial<Omit<MapTemplate, 'id'>>) => _updateTemplate(id, u), []),
    removeTemplate:   useCallback((id: string) => _removeTemplate(id), []),
    updateGridConfig: useCallback((u: Parameters<typeof _updateGrid>[0]) => _updateGrid(u), []),
    clearMap:         useCallback(() => _clearMap(), []),
    setFogEnabled:    useCallback((enabled: boolean) => _setFogEnabled(enabled), []),
    revealFog:        useCallback((cells: string[]) => _revealFog(cells), []),
    coverFog:         useCallback((cells: string[]) => _coverFog(cells), []),
  };
}
