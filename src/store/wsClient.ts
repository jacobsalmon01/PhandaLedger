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

const _hasDmToken = new URLSearchParams(window.location.search).has('dm');

export const role: WsRole =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  _hasDmToken
    ? 'admin'
    : 'player';

export const isPlayerMode = role === 'player';

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

function setStatus(s: WsStatus) {
  _status = s;
  statusListeners.forEach((fn) => fn(s));
}

// ── Socket ────────────────────────────────────────────────────────────────────

let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** State queued to send the moment the socket opens (admin only). */
let pendingState: unknown = null;

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

// ── Init ──────────────────────────────────────────────────────────────────────

connect();
