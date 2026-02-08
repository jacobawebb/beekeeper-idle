# Technical Specification

## Stack

- Next.js (App Router)
- TypeScript
- Three.js via @react-three/fiber
- Zustand for state
- IndexedDB (Dexie) for persistence

## Architecture

The project is split into clear layers:

- engine/ → Pure simulation logic (no React, no Three)
- state/ → Persistence, identity, Zustand store
- render/ → Three.js scene and models
- ui/ → HUD and panels (React + Tailwind)

## Simulation

- Deterministic tick-based simulation
- Target ~10 ticks per second
- Offline progress calculated on resume

## Rendering Rules

- 3D scene reflects state, never owns logic
- UI triggers actions, engine applies rules

## Extension Points

- `engine/model.ts` defines biome + automation extension interfaces.
- Add new biome/automation data in engine layer, then reference from state schema.
- Render layer should only consume `GameState` and never mutate it directly.

## Identity

- Client-side keypair generated via Web Crypto
- Public key hash used as userId
- Private key required to sign or restore state

## Reset Path

- Clear IndexedDB database `beekeeper-idle` (tables: `identity`, `saves`) to reset all progress.
- Programmatic reset is available via `resetSave()` in `src/game/state/save.ts`.
