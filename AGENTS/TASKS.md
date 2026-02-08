## Phase 11 – World Simulation: Bees, Placement, Economy Pressure

### Task 41 – Bee agent system (looped pathing + return generates honey)

- [ ] Replace “bounce then float” with a simple agent state machine:
  - IDLE_AT_HIVE → OUTBOUND → FORAGING → RETURNING → DELIVER → repeat
- [ ] Each bee has:
  - hiveId, position, velocity
  - target (flower/tree/hive)
  - state + stateTimer
- [ ] On DELIVER: add honey to that hive (or global) based on bee payload

DONE WHEN:

- Bees continuously move in loops, not frozen
- Bees return to hive and honey increases on return
- No excessive CPU usage with 50–200 bees

---

### Task 42 – Bee targets: flowers/trees as forage nodes

- [ ] Add “forage nodes” list from scenery objects (flowers, trees)
- [ ] Bees choose a forage node based on distance + randomness
- [ ] Ensure nodes are discoverable (not too sparse)

DONE WHEN:

- Bees visibly travel to scenery objects (flowers/trees)
- Multiple hives don’t send all bees to the same exact node every time

---

### Task 43 – Bee count scaling (more bees per hive level)

- [ ] Define scaling rule: beesPerHive = base + floor(level \* factor)
- [ ] Cap bees per hive for performance, or use LOD strategy (visual-only beyond cap)
- [ ] Ensure scaling affects production (more bees = more delivery events)

DONE WHEN:

- Increasing a hive’s level increases visible bees (up to cap)
- Honey rate increases in a way that feels consistent

---

### Task 44 – Hive placement: random but spaced (Poisson-ish)

- [ ] Replace grid placement with random placement within bounds
- [ ] Enforce min distance between hives (and optionally between hive and props)
- [ ] Attempt N samples then expand radius if needed (avoid infinite loops)

DONE WHEN:

- New hives spawn in natural-looking positions
- No overlap / too-close placements
- Placement remains fast even with many hives

---

### Task 45 – Hive floating numbers: fix positioning + update loop

- [ ] Fix per-hive “rate” labels so they:
  - always face camera (billboard)
  - update reliably (no stale state)
  - don’t jitter or clip into objects
- [ ] Add debug toggle to confirm value source and update frequency

DONE WHEN:

- Each hive displays its production rate consistently
- Numbers do not disappear or freeze during normal play

---

### Task 46 – Economy pressure: scaling costs with hive count

- [ ] Rebalance so buying many hives is not trivial:
  - Hive purchase cost scales with owned hive count
  - Upgrade costs scale partially with hive count OR per-hive upgrade costs scale harder
- [ ] Ensure early game is still fun (first 3–5 hives easy, then ramps)
- [ ] Display cost formula clearly in UI (or at least “scales with hives owned”)

DONE WHEN:

- You can’t mindlessly buy infinite hives early
- Progress remains paced but not grindy
