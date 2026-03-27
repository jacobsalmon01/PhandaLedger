/**
 * PhandaLedger — LAN Session Server
 *
 * Serves the production build as static files and opens a WebSocket channel
 * so the DM's admin tab can push live state to all connected player tabs.
 *
 * Admin detection: the DM visits their URL which includes a one-time token
 * printed at startup. Anyone without the token is a read-only player.
 * This means the DM can use any device on the network — they don't need to
 * be on the same machine as the server.
 *
 * Usage:
 *   npm run serve          (requires `npm run build` first)
 *   npm run build:serve    (builds then serves in one step)
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';
import qrcode from 'qrcode-terminal';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const DIST = path.join(__dirname, '..', 'dist');

// ── DM token ──────────────────────────────────────────────────────────────────
// Generated fresh each server start. Included in the DM's URL so any device
// on the LAN can be the admin — not just the server machine itself.

const DM_TOKEN = randomBytes(3).toString('hex'); // e.g. "a3f9c1"

// ── HTTP server ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.static(DIST));
// SPA fallback — all routes serve index.html (Express 5 wildcard syntax)
app.get('/{*path}', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

const httpServer = createServer(app);

// ── WebSocket server ──────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer });

/** Most recent party state pushed by the admin. Sent to players on connect. */
let latestState = null;

/** Battle map state cached for late-joining players. */
let latestBattleMap = null;
let latestBattleMapImage = null;

/** Projector viewport cached for late-joining projector clients. */
let latestProjectorViewport = null;

/** The active admin WebSocket (only one at a time — the DM's tab). */
let adminWs = null;

/** All connected player WebSocket connections. */
const players = new Set();

function isAdmin(req) {
  // Token-based: DM visiting from any device with the token URL
  try {
    const url = new URL(req.url, `http://localhost`);
    if (url.searchParams.get('dm') === DM_TOKEN) return true;
  } catch { /* fall through */ }

  // Localhost: DM on the same machine as the server
  const addr = req.socket.remoteAddress;
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastPlayers(msg) {
  for (const ws of players) send(ws, msg);
}

function notifyAdminPlayerCount() {
  if (adminWs) send(adminWs, { type: 'player_count', count: players.size });
}

wss.on('connection', (ws, req) => {
  if (isAdmin(req)) {
    // ── Admin (DM) ────────────────────────────────────────────────────────────
    if (adminWs) {
      adminWs.close(1000, 'Replaced');
    }
    adminWs = ws;
    console.log('  ● DM connected');

    send(ws, { type: 'hello', role: 'admin', playerCount: players.size });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'state') {
          latestState = msg.payload;
          const charCount = latestState?.characters?.length ?? 0;
          console.log(`  ↑ State received from DM (${charCount} characters) — broadcasting to ${players.size} player(s)`);
          broadcastPlayers({ type: 'state', payload: latestState });
        } else if (msg.type === 'battle_map') {
          latestBattleMap = msg.payload;
          console.log(`  ↑ Battle map update from DM — broadcasting to ${players.size} player(s)`);
          broadcastPlayers({ type: 'battle_map', payload: latestBattleMap });
        } else if (msg.type === 'battle_map_image') {
          latestBattleMapImage = msg.payload;
          const sizeKB = Math.round(JSON.stringify(msg.payload).length / 1024);
          console.log(`  ↑ Battle map image from DM (${sizeKB} KB) — broadcasting to ${players.size} player(s)`);
          broadcastPlayers({ type: 'battle_map_image', payload: latestBattleMapImage });
        } else if (msg.type === 'battle_map_clear') {
          latestBattleMap = null;
          latestBattleMapImage = null;
          latestProjectorViewport = null;
          console.log(`  ↑ Battle map cleared by DM — broadcasting to ${players.size} player(s)`);
          broadcastPlayers({ type: 'battle_map_clear' });
        } else if (msg.type === 'projector_viewport') {
          latestProjectorViewport = msg.payload;
          broadcastPlayers({ type: 'projector_viewport', payload: latestProjectorViewport });
        }
      } catch { /* ignore malformed */ }
    });

    ws.on('close', () => {
      if (adminWs === ws) adminWs = null;
      console.log('  ○ DM disconnected');
      broadcastPlayers({ type: 'admin_disconnected' });
    });

  } else {
    // ── Player ────────────────────────────────────────────────────────────────
    players.add(ws);
    notifyAdminPlayerCount();
    console.log(`  + Player connected (${players.size} total)`);

    if (latestState) {
      send(ws, { type: 'state', payload: latestState });
    } else {
      send(ws, { type: 'waiting' });
      console.log('    (no state yet — waiting for DM to connect)');
    }

    // Send cached battle map state to late-joining players
    if (latestBattleMapImage) {
      send(ws, { type: 'battle_map_image', payload: latestBattleMapImage });
    }
    if (latestBattleMap) {
      send(ws, { type: 'battle_map', payload: latestBattleMap });
    }
    if (latestProjectorViewport) {
      send(ws, { type: 'projector_viewport', payload: latestProjectorViewport });
    }

    ws.on('close', () => {
      players.delete(ws);
      notifyAdminPlayerCount();
      console.log(`  - Player disconnected (${players.size} remaining)`);
    });

    ws.on('message', () => {});
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return null;
}

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✖ Port ${PORT} is already in use.`);
    console.error(`  Run: lsof -ti :${PORT} | xargs kill\n`);
  } else {
    console.error('\n  ✖ Server error:', err.message, '\n');
  }
  process.exit(1);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  const lan = getLanIp();
  const base = lan ? `http://${lan}:${PORT}` : `http://localhost:${PORT}`;
  const dmUrl        = `${base}?dm=${DM_TOKEN}`;
  const playerUrl    = base;
  const projectorUrl = `${base}?projector`;

  const bar = '─'.repeat(52);
  console.log(`\n  ╭${bar}╮`);
  console.log(`  │       ✦  PhandaLedger — Live Session  ✦        │`);
  console.log(`  ├${bar}┤`);
  console.log(`  │  DM (you)   →  ${dmUrl.padEnd(35)}  │`);
  console.log(`  │  Players    →  ${playerUrl.padEnd(35)}  │`);
  console.log(`  │  Projector  →  ${projectorUrl.padEnd(35)}  │`);
  console.log(`  ╰${bar}╯\n`);
  console.log('  Open your DM URL — players scan the QR code below:\n');

  qrcode.generate(playerUrl, { small: true }, (qr) => {
    qr.split('\n').forEach(line => console.log('  ' + line));
    console.log(`  ${playerUrl}\n`);
    console.log('  Press Ctrl+C to end the session.\n');
  });
});
