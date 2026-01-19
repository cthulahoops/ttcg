# Objective Status Refactoring Plan

## Goal
Replace the boolean trio (`met`, `completable`, `completed`) with a two-axis tuple type and move status logic from `CharacterDisplay` to `CharacterObjective`.

## Current State
- `CharacterObjective` has: `check()`, `isCompletable()`, `isCompleted()` (booleans)
- `CharacterDisplay.renderStatus()` calls these and assembles `CharacterStatus { met, completable, completed, details? }`
- Protocol sends `CharacterStatus` in `SerializedSeat.status`
- Client interprets booleans in `PlayerSeat.tsx`

## Target State
```typescript
type Finality = "tentative" | "final";
type Outcome = "failure" | "success";
type ObjectiveStatus = [Finality, Outcome];

interface CharacterObjective {
  getStatus: (game: Game, seat: Seat) => ObjectiveStatus;
  getDetails?: (game: Game, seat: Seat) => string | undefined;
}
```

## Two-Axis Design

| Finality | Outcome | Meaning | UI |
|----------|---------|---------|-----|
| tentative | failure | Not met yet, still achievable | ✗ |
| tentative | success | Currently met, could change | ✓ |
| final | failure | Impossible to achieve | ✗ (impossible) |
| final | success | Guaranteed/locked in | ★ |

## Boolean → Status Mapping
```typescript
const finality = completed || !completable ? "final" : "tentative";
const outcome = met ? "success" : "failure";
return [finality, outcome];
```

---

## Phase 1: Foundation + Protocol (2 commits)

### Step 1.1: Add Types and Adapter Layer ✓ DONE

**Files changed:**
- `shared/types.ts` - Add `ObjectiveStatus` type
- `shared/characters/types.ts` - Extend `CharacterObjective` interface
- `shared/characters/status-adapter.ts` - New adapter module

**shared/types.ts:**
```typescript
export type Finality = "tentative" | "final";
export type Outcome = "failure" | "success";
export type ObjectiveStatus = [Finality, Outcome];
```

**shared/characters/types.ts:**
```typescript
export interface CharacterObjective {
  text?: string;
  getText?: (game: Game) => string;

  // Legacy methods (keep during migration)
  check: (game: Game, seat: Seat) => boolean;
  isCompletable: (game: Game, seat: Seat) => boolean;
  isCompleted: (game: Game, seat: Seat) => boolean;

  // New methods (optional during migration, required after)
  getStatus?: (game: Game, seat: Seat) => ObjectiveStatus;
  getDetails?: (game: Game, seat: Seat) => string | undefined;
}
```

**shared/characters/status-adapter.ts:** (see Adapter Layer Details below)

**Verification:** `bun run check` and `bun test` pass. No runtime behavior changes yet.

---

### Step 1.2: Update Protocol and Client ✓ DONE

**Files changed:**
- `shared/serialized.ts` - Replace `status` with new fields
- `shared/serialize.ts` - Use adapter
- `client/PlayerSeat.tsx` - Use new format

**shared/serialized.ts:**
```typescript
import type { ObjectiveStatus } from "./types";

export interface SerializedSeat {
  // ... existing fields ...
  // REMOVE: status?: CharacterStatus;
  objectiveStatus?: ObjectiveStatus;  // NEW: [Finality, Outcome] tuple
  statusDetails?: string;              // NEW
}
```

**shared/serialize.ts:**
```typescript
import { getObjectiveStatus, getObjectiveDetails } from "./characters/status-adapter";

// In serializeSeat():
return {
  // ... existing fields ...
  objectiveStatus: seat.character
    ? getObjectiveStatus(seat.character.objective, game, seat)
    : undefined,
  statusDetails: seat.character
    ? getObjectiveDetails(seat.character, game, seat)
    : undefined,
};
```

**client/PlayerSeat.tsx:**
```typescript
// Replace boolean interpretation with tuple destructuring
const [finality, outcome] = seat.objectiveStatus ?? [null, null];

const statusIcon = seat.objectiveStatus
  ? finality === "final" && outcome === "success"
    ? "★"                          // [final, success] → guaranteed
    : outcome === "success"
      ? "✓"                        // [tentative, success] → currently met
      : "✗"                        // [*, failure] → not met
  : null;

const isImpossible = finality === "final" && outcome === "failure";
```

**Verification:** `bun run check` and `bun test` pass. Play a game - all status icons display correctly (via adapter fallback).

---

## Adapter Layer Details

**File:** `shared/characters/status-adapter.ts`

```typescript
import type { Game } from "../game";
import type { Seat } from "../seat";
import type { ObjectiveStatus, Finality, Outcome } from "../types";
import type { CharacterObjective, CharacterDefinition } from "./types";

/**
 * Convert legacy boolean trio to ObjectiveStatus tuple.
 *
 * Two axes:
 *   Finality: "tentative" (can still change) vs "final" (locked in)
 *   Outcome: "failure" (not met) vs "success" (met)
 *
 * Mapping:
 *   [tentative, failure] → ✗ (working toward it)
 *   [tentative, success] → ✓ (currently meeting it)
 *   [final, failure]     → ✗ impossible
 *   [final, success]     → ★ (guaranteed)
 */
export function booleansToStatus(
  met: boolean,
  completable: boolean,
  completed: boolean
): ObjectiveStatus {
  const finality: Finality = completed || !completable ? "final" : "tentative";
  const outcome: Outcome = met ? "success" : "failure";
  return [finality, outcome];
}

/**
 * Get ObjectiveStatus for a character.
 *
 * Strategy:
 * 1. If objective has getStatus(), use it directly (new API)
 * 2. Otherwise, call legacy boolean methods and convert (fallback)
 *
 * This allows incremental migration - characters can be updated
 * one at a time while the system keeps working.
 */
export function getObjectiveStatus(
  objective: CharacterObjective,
  game: Game,
  seat: Seat
): ObjectiveStatus {
  // Prefer new API if available
  if (objective.getStatus) {
    return objective.getStatus(game, seat);
  }

  // Fallback: call legacy methods and convert
  const met = objective.check(game, seat);
  const completable = objective.isCompletable(game, seat);
  const completed = objective.isCompleted(game, seat);

  return booleansToStatus(met, completable, completed);
}

/**
 * Get details string for a character.
 *
 * Strategy:
 * 1. If objective has getDetails(), use it (new API)
 * 2. Otherwise, call display.renderStatus() and extract details (fallback)
 *
 * The fallback calls renderStatus() which may duplicate work with
 * getObjectiveStatus(), but this is acceptable during migration.
 * Once all characters are migrated, the fallback path is removed.
 */
export function getObjectiveDetails(
  character: CharacterDefinition,
  game: Game,
  seat: Seat
): string | undefined {
  // Prefer new API if available
  if (character.objective.getDetails) {
    return character.objective.getDetails(game, seat);
  }

  // Fallback: extract from legacy renderStatus
  const legacyStatus = character.display.renderStatus(game, seat);
  return legacyStatus.details;
}
```

### Why This Design Works

1. **No changes needed to unmigrated characters** - The adapter calls their existing methods
2. **Migrated characters bypass legacy code** - `getStatus()` is checked first
3. **Details handled separately** - Can migrate status without migrating details
4. **Single source of truth for conversion** - `booleansToStatus()` encapsulates the mapping
5. **Impossible states are impossible** - The tuple `[Finality, Outcome]` only allows valid combinations, unlike the boolean trio which permitted `{met: false, completed: true}`

---

## Phase 2: Migrate Characters (25 commits)

### Migration Order (by complexity)

**Batch 1 - Trivial (no details, always completable):**
Gandalf, Merry, Pippin, Celeborn

**Batch 2 - Simple with completability logic:**
Sam, Legolas, Gimli, Elrond

**Batch 3 - With details:**
Frodo, Gloin, Bilbo Baggins

**Batch 4 - Complex logic:**
Aragorn, Goldberry, Galadriel, Tom Bombadil, Glorfindel

**Batch 5 - Remaining:**
Boromir, Farmer Maggot, Barliman Butterbur, Bill the Pony, Gildor Inglorian, Fatty Bolger, Arwen, Gwaihir, Shadowfax

### Per-Character Migration

**Simple character (Gandalf):**
```typescript
objective: {
  text: "Win at least one trick",
  // Legacy methods (keep for now)
  check: (_game, seat) => seat.getTrickCount() >= 1,
  isCompletable: (_game, _seat) => true,
  isCompleted: (game, seat) => Gandalf.objective.check(game, seat),

  // NEW: Add getStatus - returns [Finality, Outcome] tuple
  getStatus: (_game, seat): ObjectiveStatus => {
    const hasTrick = seat.getTrickCount() >= 1;
    // Always completable, so finality depends only on success
    return hasTrick ? ["final", "success"] : ["tentative", "failure"];
  },
  // No getDetails needed - Gandalf has no details
},
```

**Character with details (Frodo):**
```typescript
objective: {
  // ... legacy methods ...

  getStatus: (game, seat): ObjectiveStatus => {
    const ringsNeeded = getRingsNeeded(game);
    const ringCount = seat.getAllWonCards()
      .filter((c: Card) => c.suit === "rings").length;

    const met = ringCount >= ringsNeeded;
    const completable = Frodo.objective.isCompletable(game, seat);
    const completed = Frodo.objective.isCompleted(game, seat);

    const finality = completed || !completable ? "final" : "tentative";
    const outcome = met ? "success" : "failure";
    return [finality, outcome];
  },

  getDetails: (_game, seat): string => {
    const ringCards = seat.getAllWonCards()
      .filter((c: Card) => c.suit === "rings");
    if (ringCards.length > 0) {
      const ringList = ringCards
        .map((c) => c.value)
        .sort((a, b) => a - b)
        .join(", ");
      return `Rings: ${ringList}`;
    }
    return "Rings: none";
  },
},
```

Note: During migration, `getStatus()` can call legacy `isCompletable()` and `isCompleted()` to avoid duplicating complex logic.

---

## Phase 3: Cleanup (after all characters migrated)

1. Make `getStatus` required in `CharacterObjective` interface
2. Remove `check`, `isCompletable`, `isCompleted` from interface
3. Remove legacy methods from each character file
4. Remove `renderStatus` from `CharacterDisplay` interface
5. Remove `renderStatus` from each character file
6. Remove fallback logic from adapter
7. Update tests to use new API

---

## Key Files

| File | Phase | Changes |
|------|-------|---------|
| `shared/types.ts` | 1.1 | Add `ObjectiveStatus` type |
| `shared/characters/types.ts` | 1.1 | Extend interface |
| `shared/characters/status-adapter.ts` | 1.1 | New adapter module |
| `shared/serialized.ts` | 1.2 | Replace `status` with new fields |
| `shared/serialize.ts` | 1.2 | Use adapter |
| `client/PlayerSeat.tsx` | 1.2 | Use new format |
| `shared/characters/*.ts` | 2 | Add `getStatus()` to each |

---

## Verification

After Step 1.1:
- `bun run check` passes
- `bun test` passes
- No runtime behavior changes

After Step 1.2:
- `bun run check` passes
- `bun test` passes
- Play a game - all status icons display correctly (via adapter fallback)

After each character migration:
- `bun test shared/characters/<name>.test.ts`
- Play a game with that character

After Phase 3:
- Full test suite passes
- No references to legacy `renderStatus` or boolean methods remain
