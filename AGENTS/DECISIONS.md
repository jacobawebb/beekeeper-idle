# Architectural & Design Decisions

## 2026-02-07 – Use R3F over Phaser

Decision:

- Use Three.js via React Three Fiber

Reason:

- Better integration with Next.js and React UI
- Idle game benefits more from UI than sprite logic

Tradeoffs:

- Slightly more manual camera setup
- No built-in game loop (handled manually)

---

## 2026-02-07 – Identity via keypair

Decision:

- No accounts, no OAuth
- Cryptographic key acts as identity

Reason:

- Zero friction onboarding
- No backend dependency
- Player-owned identity

Tradeoffs:

- User must back up key
- Loss of key = loss of save
- Zero friction onboarding
- No backend dependency
- Player-owned identity

Tradeoffs:

- User must back up key
- Loss of key = loss of save
