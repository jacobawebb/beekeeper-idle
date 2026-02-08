# Beekeeper Idle

Beekeeper Idle is a cozy, 3D incremental game about growing an apiary. You start with a single hive, generate honey over time, and expand into new hives, evolutions, and swarms while the scene comes alive with bees, foliage, and ambient audio.

**Gameplay**

- Idle honey production with optional click boosts
- Hive upgrades, evolutions, and swarm unlocks
- Multiple currencies (honey, wax, royal jelly, research points)
- Offline progress and autosaves
- Save reset and identity export/import for backups

**Tech Stack**

- Next.js (App Router) + React
- React Three Fiber for the 3D scene
- Zustand for game state
- Dexie (IndexedDB) for local saves

**Run Locally**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open `http://localhost:3000` in your browser.

**Project Structure**

- `src/app` entry points and global styles
- `src/game/engine` simulation and economy rules
- `src/game/render` 3D scene and visuals
- `src/game/ui` HUD, panels, and menus
- `src/game/state` persistence and identity helpers
