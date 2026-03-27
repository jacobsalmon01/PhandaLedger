import { useSyncExternalStore, useCallback } from 'react';
import type { MapToken, MapTemplate, AmbientLightLevel, MapLightSource } from '../types/battlemap';
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

export interface PendingMove {
  tokenId: string;
  originCol: number;
  originRow: number;
  destCol: number;
  destRow: number;
  speedFt: number;
}

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
  pendingMove: PendingMove | null;
  lightingEnabled: boolean;
  ambientLightDefault: AmbientLightLevel;
  ambientLightCells: string[];   // "col,row:level" format
  lightSources: MapLightSource[];
  lightMaskCells: string[];      // "col,row" keys where light sources are blocked
  _imgScale: number;             // player-side image downscale ratio (1 = no scaling)
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
  pendingMove: null,
  lightingEnabled: false,
  ambientLightDefault: 'bright' as AmbientLightLevel,
  ambientLightCells: [],
  lightSources: [],
  lightMaskCells: [],
  _imgScale: 1,
};

// ── Player-side image downscaling ───────────────────────────────────────────
// Mobile Safari crashes when decoding very large map images. Downscale on
// the player's device to a safe max dimension; the DM's original is untouched.

const PLAYER_MAX_IMG_DIM = 2048;

function downscaleImage(dataUrl: string): Promise<{ url: string; scale: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= PLAYER_MAX_IMG_DIM && h <= PLAYER_MAX_IMG_DIM) {
        resolve({ url: dataUrl, scale: 1 });
        return;
      }
      const scale = PLAYER_MAX_IMG_DIM / Math.max(w, h);
      const nw = Math.round(w * scale);
      const nh = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, nw, nh);
      resolve({ url: canvas.toDataURL('image/jpeg', 0.85), scale });
    };
    img.onerror = () => resolve({ url: dataUrl, scale: 1 });
    img.src = dataUrl;
  });
}

let state: BattleMapState = { ...DEFAULTS };
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

function metaOnly() {
  const { tokens, templates, gridCellSize, gridOffsetX, gridOffsetY, gridVisible, gridColor, fogEnabled, fogRevealed, pendingMove, lightingEnabled, ambientLightDefault, ambientLightCells, lightSources, lightMaskCells } = state;
  return { tokens, templates, gridCellSize, gridOffsetX, gridOffsetY, gridVisible, gridColor, fogEnabled, fogRevealed, pendingMove, lightingEnabled, ambientLightDefault, ambientLightCells, lightSources, lightMaskCells };
}

/** Same as metaOnly but without transient fields — used for localStorage persistence. */
function persistable() {
  const { pendingMove: _, ...rest } = metaOnly();
  return rest;
}

function persist() {
  if (isPlayerMode) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable()));
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
    downscaleImage(dataUrl).then(({ url, scale }) => {
      state = { ...state, mapImage: url, _imgScale: scale };
      emit();
    });
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
  state = { ...state, mapImage: dataUrl, fogEnabled: false, fogRevealed: [], lightingEnabled: false, ambientLightDefault: 'bright' as AmbientLightLevel, ambientLightCells: [], lightSources: [], lightMaskCells: [] };
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

function _updateToken(id: string, updates: Partial<Omit<MapToken, 'id'>>) {
  state = { ...state, tokens: state.tokens.map((t) => t.id === id ? { ...t, ...updates } : t) };
  persist();
  if (!isPlayerMode) _broadcastMeta();
  emit();
}

function _removeToken(id: string) {
  const removed = state.tokens.find((t) => t.id === id);
  const lightSources = state.lightSources.map((ls) => {
    if (ls.attachedTokenId === id && removed) {
      return { ...ls, col: removed.col, row: removed.row, attachedTokenId: undefined };
    }
    return ls;
  });
  state = { ...state, tokens: state.tokens.filter((t) => t.id !== id), lightSources };
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

// ── Lighting mutations ──────────────────────────────────────────────────────

function _setLightingEnabled(enabled: boolean) {
  if (isPlayerMode) return;
  state = { ...state, lightingEnabled: enabled };
  persist();
  _broadcastMeta();
  emit();
}

function _setAmbientLightDefault(level: AmbientLightLevel) {
  if (isPlayerMode) return;
  state = { ...state, ambientLightDefault: level };
  persist();
  _broadcastMeta();
  emit();
}

function _paintAmbientLight(cells: string[], level: AmbientLightLevel) {
  if (isPlayerMode) return;
  const map = new Map<string, string>();
  for (const entry of state.ambientLightCells) {
    const [key, val] = entry.split(':');
    map.set(key, val);
  }
  for (const c of cells) map.set(c, level);
  state = { ...state, ambientLightCells: [...map].map(([k, v]) => `${k}:${v}`) };
  persist();
  _broadcastMeta();
  emit();
}

function _clearAmbientLight(cells: string[]) {
  if (isPlayerMode) return;
  const toRemove = new Set(cells);
  state = { ...state, ambientLightCells: state.ambientLightCells.filter((entry) => !toRemove.has(entry.split(':')[0])) };
  persist();
  _broadcastMeta();
  emit();
}

function _addLightSource(source: Omit<MapLightSource, 'id'>) {
  if (isPlayerMode) return;
  state = { ...state, lightSources: [...state.lightSources, { ...source, id: uuid() }] };
  persist();
  _broadcastMeta();
  emit();
}

function _moveLightSource(id: string, col: number, row: number) {
  if (isPlayerMode) return;
  state = { ...state, lightSources: state.lightSources.map((ls) => ls.id === id ? { ...ls, col, row } : ls) };
  persist();
  _broadcastMeta();
  emit();
}

function _updateLightSource(id: string, updates: Partial<Omit<MapLightSource, 'id'>>) {
  if (isPlayerMode) return;
  state = { ...state, lightSources: state.lightSources.map((ls) => ls.id === id ? { ...ls, ...updates } : ls) };
  persist();
  _broadcastMeta();
  emit();
}

function _removeLightSource(id: string) {
  if (isPlayerMode) return;
  state = { ...state, lightSources: state.lightSources.filter((ls) => ls.id !== id) };
  persist();
  _broadcastMeta();
  emit();
}

function _maskLight(cells: string[]) {
  if (isPlayerMode) return;
  const set = new Set(state.lightMaskCells);
  for (const c of cells) set.add(c);
  state = { ...state, lightMaskCells: [...set] };
  persist();
  _broadcastMeta();
  emit();
}

function _unmaskLight(cells: string[]) {
  if (isPlayerMode) return;
  const set = new Set(state.lightMaskCells);
  for (const c of cells) set.delete(c);
  state = { ...state, lightMaskCells: [...set] };
  persist();
  _broadcastMeta();
  emit();
}

function _setPendingMove(move: PendingMove | null) {
  if (isPlayerMode) return;
  state = { ...state, pendingMove: move };
  // Don't persist — pendingMove is transient. Just broadcast + emit.
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
  const s = snap._imgScale;

  return {
    mapImage: snap.mapImage,
    tokens: snap.tokens,
    templates: snap.templates,
    gridCellSize: snap.gridCellSize * s,
    gridOffsetX: snap.gridOffsetX * s,
    gridOffsetY: snap.gridOffsetY * s,
    gridVisible: snap.gridVisible,
    gridColor: snap.gridColor,
    fogEnabled: snap.fogEnabled,
    fogRevealed: snap.fogRevealed,
    pendingMove: snap.pendingMove,
    lightingEnabled: snap.lightingEnabled,
    ambientLightDefault: snap.ambientLightDefault,
    ambientLightCells: snap.ambientLightCells,
    lightSources: snap.lightSources,
    lightMaskCells: snap.lightMaskCells,
    imgScale: s,
    setMapImage:      useCallback((url: string) => _setMapImage(url), []),
    addToken:         useCallback((t: Omit<MapToken, 'id'>) => _addToken(t), []),
    updateToken:      useCallback((id: string, u: Partial<Omit<MapToken, 'id'>>) => _updateToken(id, u), []),
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
    setPendingMove:   useCallback((move: PendingMove | null) => _setPendingMove(move), []),
    setLightingEnabled:  useCallback((enabled: boolean) => _setLightingEnabled(enabled), []),
    setAmbientLightDefault: useCallback((level: AmbientLightLevel) => _setAmbientLightDefault(level), []),
    paintAmbientLight:   useCallback((cells: string[], level: AmbientLightLevel) => _paintAmbientLight(cells, level), []),
    clearAmbientLight:   useCallback((cells: string[]) => _clearAmbientLight(cells), []),
    addLightSource:      useCallback((s: Omit<MapLightSource, 'id'>) => _addLightSource(s), []),
    moveLightSource:     useCallback((id: string, col: number, row: number) => _moveLightSource(id, col, row), []),
    updateLightSource:   useCallback((id: string, u: Partial<Omit<MapLightSource, 'id'>>) => _updateLightSource(id, u), []),
    removeLightSource:   useCallback((id: string) => _removeLightSource(id), []),
    maskLight:           useCallback((cells: string[]) => _maskLight(cells), []),
    unmaskLight:         useCallback((cells: string[]) => _unmaskLight(cells), []),
  };
}
