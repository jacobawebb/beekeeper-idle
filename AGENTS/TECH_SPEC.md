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

## Identity

- Client-side keypair generated via Web Crypto
- Public key hash used as userId
- Private key required to sign or restore state
