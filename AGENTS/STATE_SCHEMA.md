# Game State Schema (v1)

## GameState

- version: number
- meta:
  - createdAt
  - lastSeenAt
  - lastTickAt

## Currencies

- honey
- wax
- royalJelly
- researchPoints

## Hives[]

- id
- level
- evolutionTier
- cycleProgressMs
- baseYield
- baseCycleMs
- assignedBiomeId?

## Upgrades

- globalMultipliers
- automationLevels

## Flags

- hasBackedUpKey
