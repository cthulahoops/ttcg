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

## Phase 2: Sam Test Migration (delete old interface)

Fully migrate Sam as a test case to validate the new interface works end-to-end. This includes **deleting** the legacy methods to prove the adapter fallback is no longer needed for migrated characters.

### Step 2.1: Add getStatus to Sam

**shared/characters/sam.ts:**
```typescript
import type { ObjectiveStatus } from "../types";

objective: {
  text: "Win the Hills card matching your threat card",

  // Legacy methods (will be removed in Step 2.3)
  check: (game, seat) => { ... },
  isCompletable: (game, seat) => { ... },
  isCompleted: (game, seat) => { ... },

  // NEW
  getStatus: (game, seat): ObjectiveStatus => {
    if (!seat.threatCard) {
      return ["tentative", "failure"];
    }
    const hasCard = game.hasCard(seat, "hills", seat.threatCard);
    const cardGone = game.cardGone(seat, "hills", seat.threatCard);

    if (hasCard) {
      return ["final", "success"];
    } else if (cardGone) {
      return ["final", "failure"];
    } else {
      return ["tentative", "failure"];
    }
  },
  // No getDetails needed - Sam has no details
},
```

**Verification:** `bun run check` passes. Play a game with Sam - status displays correctly (now via getStatus, not adapter fallback).

---

### Step 2.2: Remove renderStatus from Sam

Delete the `renderStatus` method from Sam's display object. The adapter's `getObjectiveDetails()` fallback is no longer needed since Sam has no details.

**shared/characters/sam.ts:**
```typescript
display: {
  // REMOVE: renderStatus - no longer needed
  getObjectiveCards: (game, seat) => { ... },
},
```

**Verification:** `bun run check` passes. Confirm status still displays correctly.

---

### Step 2.3: Delete legacy methods and update interface

This step makes three coordinated changes so tests pass:

1. **Update `CharacterObjective` interface** - Make legacy methods optional
2. **Update adapter** - Add validation for missing methods
3. **Delete legacy methods from Sam** - Remove `check`, `isCompletable`, `isCompleted`
4. **Update Sam tests** - If any tests use the old API

**shared/characters/types.ts:**
```typescript
export interface CharacterObjective {
  text?: string;
  getText?: (game: Game) => string;

  // Legacy methods - optional during migration
  // Characters with getStatus() don't need these
  check?: (game: Game, seat: Seat) => boolean;
  isCompletable?: (game: Game, seat: Seat) => boolean;
  isCompleted?: (game: Game, seat: Seat) => boolean;

  // New methods
  getStatus?: (game: Game, seat: Seat) => ObjectiveStatus;
  getDetails?: (game: Game, seat: Seat) => string | undefined;
}
```

**shared/characters/status-adapter.ts:**
```typescript
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
  // All three must exist for fallback to work
  if (!objective.check || !objective.isCompletable || !objective.isCompleted) {
    throw new Error("Character must have either getStatus() or all legacy methods");
  }

  const met = objective.check(game, seat);
  const completable = objective.isCompletable(game, seat);
  const completed = objective.isCompleted(game, seat);

  return booleansToStatus(met, completable, completed);
}
```

**shared/characters/sam.ts:**
```typescript
objective: {
  text: "Win the Hills card matching your threat card",

  getStatus: (game, seat): ObjectiveStatus => {
    if (!seat.threatCard) {
      return ["tentative", "failure"];
    }
    const hasCard = game.hasCard(seat, "hills", seat.threatCard);
    const cardGone = game.cardGone(seat, "hills", seat.threatCard);

    if (hasCard) {
      return ["final", "success"];
    } else if (cardGone) {
      return ["final", "failure"];
    } else {
      return ["tentative", "failure"];
    }
  },
},
```

**Verification:** `bun run check` and `bun test` pass. Sam works with new API, other characters work via legacy fallback.

---

### Phase 2 Outcome

After completing Phase 2:
- Sam is fully migrated (no legacy methods)
- Interface allows either old or new API
- Adapter validates that characters have one or the other
- All other characters still work via adapter fallback
- We've proven the migration path works

---

## Phase 3: Migrate Remaining Characters

### Migration Order (by complexity)

**Batch 1 - Trivial (no details, always completable):**
Gandalf, Merry, Pippin, Celeborn

**Batch 2 - Simple with completability logic:**
Legolas, Gimli, Elrond

**Batch 3 - With details:**
Frodo, Gloin, Bilbo Baggins

**Batch 4 - Complex logic:**
Aragorn, Goldberry, Galadriel, Tom Bombadil, Glorfindel

**Batch 5 - Remaining:**
Boromir, Farmer Maggot, Barliman Butterbur, Bill the Pony, Gildor Inglorian, Fatty Bolger, Arwen, Gwaihir, Shadowfax

### Per-Character Migration Pattern

For each character:
1. Add `getStatus()` method
2. Add `getDetails()` if character has details
3. Remove `renderStatus()` from display
4. Remove legacy `check`, `isCompletable`, `isCompleted`
5. Update tests if needed

**Example - Simple character (Gandalf):**
```typescript
objective: {
  text: "Win at least one trick",

  getStatus: (_game, seat): ObjectiveStatus => {
    const hasTrick = seat.getTrickCount() >= 1;
    return hasTrick ? ["final", "success"] : ["tentative", "failure"];
  },
},
```

**Example - Character with details (Frodo):**
```typescript
objective: {
  getText: (game) => `Win ${getRingsNeeded(game)} Ring cards`,

  getStatus: (game, seat): ObjectiveStatus => {
    const ringsNeeded = getRingsNeeded(game);
    const ringCards = seat.getAllWonCards().filter((c) => c.suit === "rings");
    const ringCount = ringCards.length;
    const ringsAvailable = 5 - game.seats.reduce((sum, s) =>
      s !== seat ? sum + s.getAllWonCards().filter(c => c.suit === "rings").length : sum, 0);

    if (ringCount >= ringsNeeded) {
      return ["final", "success"];
    } else if (ringCount + ringsAvailable < ringsNeeded) {
      return ["final", "failure"];
    } else {
      return ["tentative", "failure"];
    }
  },

  getDetails: (_game, seat): string => {
    const ringCards = seat.getAllWonCards().filter((c) => c.suit === "rings");
    if (ringCards.length > 0) {
      const ringList = ringCards.map((c) => c.value).sort((a, b) => a - b).join(", ");
      return `Rings: ${ringList}`;
    }
    return "Rings: none";
  },
},
```

---

## Phase 4: Final Cleanup

After all characters are migrated:

1. Make `getStatus` required in `CharacterObjective` interface
2. Remove optional `check`, `isCompletable`, `isCompleted` from interface
3. Remove `renderStatus` from `CharacterDisplay` interface
4. Remove fallback logic from adapter (the error throw)
5. Remove `booleansToStatus()` helper (no longer needed)
6. Update any remaining tests using old API

---

## Key Files

| File | Phase | Changes |
|------|-------|---------|
| `shared/types.ts` | 1.1 | Add `ObjectiveStatus` type |
| `shared/characters/types.ts` | 1.1, 2.4, 4 | Extend interface, make legacy optional, then remove |
| `shared/characters/status-adapter.ts` | 1.1, 2.4, 4 | New adapter, add validation, then simplify |
| `shared/serialized.ts` | 1.2 | Replace `status` with new fields |
| `shared/serialize.ts` | 1.2 | Use adapter |
| `client/PlayerSeat.tsx` | 1.2 | Use new format |
| `shared/characters/sam.ts` | 2 | Full migration test case |
| `shared/characters/*.ts` | 3 | Migrate remaining characters |

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

After Phase 2 (Sam migration):
- `bun run check` passes
- `bun test` passes
- Sam works in-game with new API only
- Other characters still work via adapter fallback

After each Phase 3 character migration:
- `bun run check` passes
- Play a game with that character

After Phase 4:
- Full test suite passes
- No references to legacy `renderStatus` or boolean methods remain
- Adapter has no fallback path
