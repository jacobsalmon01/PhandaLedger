/**
 * PlayerBanner
 *
 * Two distinct uses:
 *
 *   Player mode  — full-width banner at the top of the page showing live
 *                  connection status (connected / waiting for DM / reconnecting).
 *
 *   Admin mode   — small inline badge in the sidebar showing how many players
 *                  are currently watching (only rendered when count > 0 and
 *                  the WS server is reachable).
 */

import { useState, useEffect } from 'react';
import { isPlayerMode, onStatusChange, onPlayerCountChange, type WsStatus } from '../store/wsClient';

// ── Player banner (full-width) ────────────────────────────────────────────────

export function PlayerBanner() {
  const [status, setStatus] = useState<WsStatus>('connecting');

  useEffect(() => onStatusChange(setStatus), []);

  if (!isPlayerMode) return null;

  const { dot, label } = statusDisplay(status);

  return (
    <div className={`player-banner player-banner--${status}`}>
      <span className="player-banner__dot">{dot}</span>
      <span className="player-banner__label">{label}</span>
      <span className="player-banner__tag">Live View · Read Only</span>
    </div>
  );
}

function statusDisplay(status: WsStatus): { dot: string; label: string } {
  switch (status) {
    case 'connected':    return { dot: '●', label: 'Connected' };
    case 'connecting':   return { dot: '○', label: 'Connecting…' };
    case 'disconnected': return { dot: '○', label: 'Reconnecting…' };
    case 'unavailable':  return { dot: '○', label: 'Waiting for DM…' };
  }
}

// ── Admin watcher badge (sidebar) ─────────────────────────────────────────────

export function WatcherBadge() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<WsStatus>('connecting');

  useEffect(() => onStatusChange(setStatus), []);
  useEffect(() => onPlayerCountChange(setCount), []);

  // Only show when the server is running and players are present.
  if (isPlayerMode) return null;
  if (status === 'unavailable') return null;
  if (count === 0) return null;

  return (
    <div className="watcher-badge">
      <span className="watcher-badge__dot">●</span>
      {count} player{count !== 1 ? 's' : ''} watching
    </div>
  );
}
