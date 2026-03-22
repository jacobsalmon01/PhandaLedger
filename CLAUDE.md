# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript check + production build (tsc -b && vite build)
npm run lint         # ESLint static analysis
npm run preview      # Preview production build locally
npm run serve        # Build + start Express/WS server for LAN play
npm run test         # Run Vitest unit tests
```

## Visual Screenshot Verification

Use the `/screenshot` command to capture and examine the app visually after front-end changes.

```bash
npm run screenshot   # Capture screenshots of the running app (requires npm run dev first)
```

Screenshots are saved to `tmp/screenshots/` (gitignored). The `/screenshot` command starts the dev server if needed, runs the capture, and visually examines every PNG — flagging layout issues, broken components, or unexpected blank areas. Use this after any UI change rather than relying solely on code review.

## Architecture

**PhandaLedger** is a D&D 5e character sheet manager — a React SPA with localStorage persistence. It has two modes: standalone client-only, or networked via `server/index.js` (Express + WebSocket) for live LAN sessions.

### State Management

`src/store/useStore.ts` implements a custom store using React's `useSyncExternalStore`. `AppState` holds `characters[]`, `selectedId`, and `initiative[]`. All mutations go through `updateCharacter()` or `setState()`, which persist to localStorage and notify subscribers. Schema migration logic runs on hydration.

### Data Model

`src/types/character.ts` defines the full D&D 5e character schema plus utility functions: `abilityMod()`, `profBonus()`, `calcAC()`, `calcEffectiveAC()`, `spellAttackBonus()`, `spellSaveDC()`, and `createCharacter()`. Key character fields beyond the basics:

- `spells[]` — PreparedSpell with concentration, duration, casting time, round counter
- `weapons[]` — damage dice, versatile/two-handed, finesse, proficiency, sneak attack
- `inventory[]` — InventoryItem with quantity, value (gp), equipped flag, stat modifiers (add/mul/set)
- `gold` — `{ cp, sp, ep, gp, pp }`
- `resources[]` — TrackedResource with max, used, recharge type (short/long/manual)
- `conditions[]` — ConditionEntry[] with optional round timers; Exhaustion tracks 1–6 levels
- `deathSaves` — `{ successes, failures }`; `dead: boolean`
- `fightingStyles[]` — affects effective AC (defense style) and attack modifiers
- `shortRestsUsed` — 0–2, resets on long rest
- `lastLongRestTimestamp` — epoch ms for 24h cooldown enforcement

### LAN Session Mode

`server/index.js` (Express + `ws`) enables live DM-to-player streaming:

- On startup, generates a one-time DM token (6 hex chars), prints both DM and player URLs, and renders a QR code in the terminal for easy player access.
- **Role detection** in `src/store/wsClient.ts`: `localhost`/`127.0.0.1` → admin (full edit); `?dm=<TOKEN>` param → admin on remote device; any other hostname → player (read-only).
- **Admin** broadcasts full `AppState` to server on every change; server caches and forwards to all players.
- **Player** receives state live; preserves own `selectedId` (players manage their own character selection independently).
- `WsStatus`: `'connecting'` | `'connected'` | `'disconnected'` | `'unavailable'`

### Component Layout

```
App
├── PlayerBanner              — WS connection status (player mode only)
├── Sidebar
│   ├── Character roster      — portraits, HP, dead state, add/remove
│   ├── ImportExportControls  — JSON file download/upload
│   ├── ShareControls         — URL-encoded party share link
│   ├── InitiativeTracker     — combat turn order (PCs + NPCs with HP)
│   ├── DiceRoller            — d4–d100, advantage, skill checks
│   ├── RestsSection          — short/long rest with HP distribution
│   └── WatcherBadge          — live player count (admin mode)
└── CharacterSheet            — 5-tab sheet (Stats, Combat, Spells, Character, Inventory)
    ├── CharacterHeader        — portrait, name, conditions, AC/init/speed
    ├── AbilityScoresSection   — scores, saves, skills
    ├── HitPointsSection       — HP bar, damage/heal, death saves, concentration check
    ├── DefenseSection         — armor, shield, initiative, AC calc
    ├── SpellSlotsSection      — 9 levels, visual progress bars
    ├── SpellsSection          — spell list, concentration tracking
    ├── WeaponsSection         — weapon list with attack/damage
    ├── InventorySection       — items, equipped modifiers, gold
    ├── ResourcesSection       — custom tracked resources
    └── SkillsSection          — 18 skills, passive perception
```

Modals: `PortraitCropModal` (canvas drag/scroll crop), `ShortRestModal` (HP distribution), `DeathSavingThrowModal`, `ConcentrationCheckModal` (auto-triggered on damage while concentrating), `ConditionPicker`, `IncomingShareModal`.

`NumericInput` is a small reusable wrapper that allows clearing a number field while the user is mid-edit.

### URL-Based Party Sharing

`src/utils/shareUrl.ts` encodes party data (portraits stripped) into a URL hash (`#share=<base64url>`). Encoding: JSON → deflate-raw compress → base64url. On app mount, `App.tsx` detects the hash and shows `IncomingShareModal` to add or replace the party.

### Key Constraints

- **No external state library** — use the custom `useSyncExternalStore` store in `src/store/useStore.ts`.
- **localStorage only** — portraits are stored as base64 data URLs; be mindful of storage limits when adding new data.
- **No new backend** — do not add server-side code beyond `server/index.js` without discussing it first.
- **Styling is hand-rolled CSS** — the 1st Edition AD&D aesthetic (Cinzel/Gentium fonts, gold/brown palette) is intentional. No CSS framework is used.
- **Player mode is read-only** — mutations must be guarded with `isPlayerMode` checks; the `.player-mode` body class hides edit controls via CSS.
- **UUID generation** — use `src/utils/uuid.ts` (not `crypto.randomUUID()` directly); it has a fallback for plain HTTP (LAN IPs where secure context is unavailable).
