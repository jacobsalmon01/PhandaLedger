/**
 * wsClient.ts
 *
 * Singleton WebSocket client for LAN session mode.
 *
 * Role detection (determined once at module load):
 *   localhost / 127.0.0.1  →  admin  (full edit access, broadcasts state)
 *   ?dm=<TOKEN> present     →  admin  (DM visiting via LAN IP with their token URL)
 *   any other hostname      →  player (read-only, receives state)
 *
 * When running via `npm run dev` (Vite, no WS server), the connection attempt
 * fails quickly and the module falls back silently — the app behaves exactly
 * as it does today.
 */

// ── Role ──────────────────────────────────────────────────────────────────────

export type WsRole = 'admin' | 'player';

const _params = new URLSearchParams(window.location.search);
const _hasDmToken = _params.has('dm');
const _forcePlayer = _params.has('player');
const _isProjector = _params.has('projector');

export const role: WsRole =
  _forcePlayer || _isProjector
    ? 'player'
    : window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      _hasDmToken
      ? 'admin'
      : 'player';

export const isPlayerMode = role === 'player';
/** True only when player mode is forced via ?player query param (dev convenience). */
export const isDevPlayerMode = _forcePlayer;
/** Projector mode — fullscreen battlemap, independently pannable/zoomable. */
export const isProjectorMode = _isProjector;

// ── Status ────────────────────────────────────────────────────────────────────

export type WsStatus =
  | 'connecting'      // initial / reconnecting
  | 'connected'       // WS open, session active
  | 'disconnected'    // was connected, lost it — retrying
  | 'unavailable';    // never connected (dev mode / no server)

type AnyFn<T> = (value: T) => void;

let _status: WsStatus = 'connecting';
const statusListeners   = new Set<AnyFn<WsStatus>>();
const stateListeners    = new Set<AnyFn<unknown>>();
const playerCountListeners = new Set<AnyFn<number>>();

// Battle map listeners
const battleMapListeners      = new Set<AnyFn<unknown>>();
const battleMapImageListeners = new Set<AnyFn<string>>();
const battleMapClearListeners = new Set<() => void>();

// Projector viewport listeners
export type ProjectorViewport = { zoom: number; centerWorldX: number; centerWorldY: number; selectedTokenId?: string | null };
const projectorViewportListeners = new Set<AnyFn<ProjectorViewport>>();

function setStatus(s: WsStatus) {
  _status = s;
  statusListeners.forEach((fn) => fn(s));
}

// ── Socket ────────────────────────────────────────────────────────────────────

let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** State queued to send the moment the socket opens (admin only). */
let pendingState: unknown = null;
let pendingBattleMap: unknown = null;
let pendingBattleMapImage: string | null = null;
let pendingProjectorViewport: ProjectorViewport | null = null;

function connect() {
  retryTimer = null;
  try {
    const wsUrl = _hasDmToken
      ? `ws://${window.location.host}?dm=${new URLSearchParams(window.location.search).get('dm')}`
      : `ws://${window.location.host}`;
    socket = new WebSocket(wsUrl);
  } catch {
    setStatus('unavailable');
    return;
  }

  const connectedAt = Date.now();

  socket.onopen = () => {
    setStatus('connected');
    if (pendingState !== null) {
      _send({ type: 'state', payload: pendingState });
      pendingState = null;
    }
    if (pendingBattleMap !== null) {
      _send({ type: 'battle_map', payload: pendingBattleMap });
      pendingBattleMap = null;
    }
    if (pendingBattleMapImage !== null) {
      _send({ type: 'battle_map_image', payload: pendingBattleMapImage });
      pendingBattleMapImage = null;
    }
    if (pendingProjectorViewport !== null) {
      _send({ type: 'projector_viewport', payload: pendingProjectorViewport });
      pendingProjectorViewport = null;
    }
  };

  socket.onmessage = ({ data }) => {
    try {
      const msg = JSON.parse(data as string);
      switch (msg.type) {
        case 'hello':
          // Server greeting — carries initial player count for the admin.
          playerCountListeners.forEach((fn) => fn(msg.playerCount ?? 0));
          break;
        case 'player_count':
          playerCountListeners.forEach((fn) => fn(msg.count ?? 0));
          break;
        case 'state':
          stateListeners.forEach((fn) => fn(msg.payload));
          break;
        case 'battle_map':
          battleMapListeners.forEach((fn) => fn(msg.payload));
          break;
        case 'battle_map_image':
          battleMapImageListeners.forEach((fn) => fn(msg.payload));
          break;
        case 'battle_map_clear':
          battleMapClearListeners.forEach((fn) => fn());
          break;
        case 'projector_viewport':
          projectorViewportListeners.forEach((fn) => fn(msg.payload));
          break;
        case 'waiting':
          // Player connected before the DM — banner handles this via 'connecting' status.
          break;
        case 'admin_disconnected':
          setStatus('disconnected');
          schedule(2_000);
          break;
      }
    } catch { /* ignore malformed frames */ }
  };

  socket.onclose = () => {
    socket = null;
    const age = Date.now() - connectedAt;
    if (age < 500) {
      // Never really established — almost certainly running in dev mode (no server).
      setStatus('unavailable');
      schedule(15_000); // low-frequency retry; won't bother the user
    } else {
      setStatus('disconnected');
      schedule(2_000);
    }
  };

  socket.onerror = () => { /* onclose fires next */ };
}

function schedule(ms: number) {
  if (retryTimer === null) {
    retryTimer = setTimeout(connect, ms);
  }
}

function _send(msg: unknown) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Push the current app state to all connected players.
 * No-op if not admin or not connected (state is queued for next connect).
 */
export function broadcastState(state: unknown) {
  if (role !== 'admin') return;
  if (_status === 'connected') {
    _send({ type: 'state', payload: state });
  } else {
    pendingState = state;
  }
}

/** Subscribe to state updates pushed from the server (player only). */
export function onStateReceived(fn: AnyFn<unknown>): () => void {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}

/** Subscribe to connection status changes. Fires immediately with current status. */
export function onStatusChange(fn: AnyFn<WsStatus>): () => void {
  statusListeners.add(fn);
  fn(_status);
  return () => statusListeners.delete(fn);
}

/** Subscribe to player-count updates (useful for the DM's admin indicator). */
export function onPlayerCountChange(fn: AnyFn<number>): () => void {
  playerCountListeners.add(fn);
  return () => playerCountListeners.delete(fn);
}

export function getStatus(): WsStatus { return _status; }

// ── Battle Map API ────────────────────────────────────────────────────────────

/** Broadcast battle map metadata (tokens + grid config) to players. */
export function broadcastBattleMap(meta: unknown) {
  if (role !== 'admin') return;
  if (_status === 'connected') {
    _send({ type: 'battle_map', payload: meta });
  } else {
    pendingBattleMap = meta;
  }
}

/** Broadcast the battle map image (data URL) to players. Sent only on upload. */
export function broadcastBattleMapImage(dataUrl: string) {
  if (role !== 'admin') return;
  if (_status === 'connected') {
    _send({ type: 'battle_map_image', payload: dataUrl });
  } else {
    pendingBattleMapImage = dataUrl;
  }
}

/** Notify players that the battle map has been cleared. */
export function broadcastBattleMapClear() {
  if (role !== 'admin') return;
  pendingBattleMap = null;
  pendingBattleMapImage = null;
  if (_status === 'connected') {
    _send({ type: 'battle_map_clear' });
  }
}

/** Subscribe to battle map metadata updates (player only). */
export function onBattleMapReceived(fn: AnyFn<unknown>): () => void {
  battleMapListeners.add(fn);
  return () => battleMapListeners.delete(fn);
}

/** Subscribe to battle map image updates (player only). */
export function onBattleMapImageReceived(fn: AnyFn<string>): () => void {
  battleMapImageListeners.add(fn);
  return () => battleMapImageListeners.delete(fn);
}

/** Subscribe to battle map clear events (player only). */
export function onBattleMapCleared(fn: () => void): () => void {
  battleMapClearListeners.add(fn);
  return () => battleMapClearListeners.delete(fn);
}

// ── Projector Viewport API ────────────────────────────────────────────────────

/** Broadcast projector viewport (world coords) to projector clients. Admin only. */
export function broadcastProjectorViewport(viewport: ProjectorViewport) {
  if (role !== 'admin') return;
  if (_status === 'connected') {
    _send({ type: 'projector_viewport', payload: viewport });
  } else {
    pendingProjectorViewport = viewport;
  }
}

/** Subscribe to projector viewport updates (projector client only). */
export function onProjectorViewportReceived(fn: AnyFn<ProjectorViewport>): () => void {
  projectorViewportListeners.add(fn);
  return () => projectorViewportListeners.delete(fn);
}

// ── Init ──────────────────────────────────────────────────────────────────────

connect();
