# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript check + production build (tsc -b && vite build)
npm run lint      # ESLint static analysis
npm run preview   # Preview production build locally
```

There are no tests configured in this project.

## Architecture

**PhandaLedger** is a D&D 5e character sheet manager — a fully client-side React SPA with no backend, no API calls, and no auth. All data persists via `localStorage`.

### State Management

`src/store/useStore.ts` implements a custom store using React's `useSyncExternalStore`. It holds `AppState: { characters: Character[], selectedId: string | null }`. All mutations go through `updateCharacter()` or `setState()`, which persist to localStorage and notify subscribers. There is migration logic in the hydration path for schema changes.

### Data Model

`src/types/character.ts` defines the full D&D 5e character schema plus utility functions: `abilityMod()`, `profBonus()`, `calcAC()`, and `createCharacter()`. AC is computed dynamically from armor type, DEX modifier, and shield bonus.

### Component Layout

```
App
├── Sidebar          — character roster, portrait thumbnails, rest buttons, add/remove
└── CharacterSheet   — full sheet: identity, ability scores, saving throws, AC, HP,
                       spell slots (9 levels), tracked resources
    └── PortraitCropModal — canvas-based image crop/zoom via drag and scroll wheel
```

`NumericInput` is a small reusable wrapper that allows clearing a number field while the user is mid-edit.

### Key Constraints

- **No external state library** — state is managed via the custom `useSyncExternalStore` store in `src/store/useStore.ts`.
- **localStorage only** — portraits are stored as base64 data URLs; be mindful of storage limits when adding new data.
- **No backend** — do not add server-side code, API routes, or auth without discussing it first.
- **Styling is hand-rolled CSS** — the 1st Edition AD&D aesthetic (Cinzel/Gentium fonts, gold/brown palette) is intentional. No CSS framework is used.
