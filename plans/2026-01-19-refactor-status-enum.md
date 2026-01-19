# Refactor Objective Status from Boolean Trio to Status Type

## Problem Statement

Currently, objective status is represented as three booleans (`met`, `completable`, `completed`) which allows encoding impossible states. For example, `{met: false, completed: true}` makes no logical sense.

Additionally, `renderStatus` has been held over from before the server/client refactor and is the wrong abstraction. Character definitions should expose status and details directly in the protocol.

## Proposed Solution

Replace the boolean trio with a string literal union type:

```typescript
type ObjectiveStatus = "pending" | "met" | "failed" | "complete";

interface ObjectiveState {
  status: ObjectiveStatus;
  details?: string;
}
```

**Status Meanings:**

- `"pending"` - Not met, still possible (met=false, completable=true)
- `"met"` - Currently met, not locked in (met=true, completed=false)
- `"failed"` - No longer achievable (completable=false)
- `"complete"` - Permanently achieved (completed=true)

## Progress Status

**Completed:** Steps 1-5 (Foundation and infrastructure)
**Remaining:** Steps 6-8 (Character migration and cleanup)

✅ Type system updated (Step 1)
✅ Adapter layer created (Step 2)
✅ Dual-API support added (Step 3)
✅ Protocol updated (Step 4)
✅ Client rendering updated (Step 5)
⏳ Character migration pending (Step 6) - **27+ characters to migrate**
⏳ Legacy code cleanup pending (Step 7)
⏳ Optional simplification pending (Step 8)

**Current State:** The system now uses `ObjectiveStatus` string literals throughout the protocol and client. All 27+ characters still use the old `renderStatus` API, which is automatically converted via the adapter layer. Ready to begin incremental character migration.

## Refactoring Steps

### ✅ Step 1: Add New Types (Additions Only) - COMPLETED

_Commit: "Add ObjectiveStatus type and ObjectiveState interface" (33fe989)_

- Add to `shared/types.ts`:

  ```typescript
  export type ObjectiveStatus = "pending" | "met" | "failed" | "complete";

  export interface ObjectiveState {
    status: ObjectiveStatus;
    details?: string;
  }
  ```

- Keep existing `CharacterStatus` interface unchanged (backward compatibility)
- **Test:** Type checking passes (`bun run check`)

### ✅ Step 2: Create Adapter/Wrapper Layer - COMPLETED

_Commit: "Add conversion utilities between status representations" (ab3bfb9, fixup 672984c)_

- Add utility functions in `shared/utils.ts`:
  - `statusFromBooleans(met: boolean, completable: boolean, completed: boolean): ObjectiveStatus`
    - Converts boolean trio to status type
    - Handles state priority: completed > met > failed > pending
  - `booleansFromStatus(status: ObjectiveStatus): CharacterStatus`
    - Converts status type back to booleans (for testing adapter)
- Add unit tests for all state combinations
- **Test:** Unit tests pass, validates state machine logic

### ✅ Step 3: Add Optional New API to Character Interface - COMPLETED

_Commit: "Add optional getStatus method to CharacterDisplay" (6c44f1e)_

- Update `shared/characters/types.ts`:
  ```typescript
  export interface CharacterDisplay {
    renderStatus: (game: Game, seat: Seat) => CharacterStatus; // Keep existing - required
    getStatus?: (game: Game, seat: Seat) => ObjectiveState; // Add optional new API
    getObjectiveCards?: (game: Game, seat: Seat) => ObjectiveCards;
  }
  ```
- Add helper in `shared/utils.ts`:

  ```typescript
  export function getObjectiveState(game: Game, seat: Seat): ObjectiveState {
    const display = seat.character?.display;
    if (!display) {
      return { status: "pending" };
    }

    // Prefer new API if available
    if (display.getStatus) {
      return display.getStatus(game, seat);
    }

    // Fall back to old API + adapter
    const legacy = display.renderStatus(game, seat);
    return {
      status: statusFromBooleans(
        legacy.met,
        legacy.completable,
        legacy.completed
      ),
      details: legacy.details,
    };
  }
  ```

- **Test:** Type checking passes (`bun run check`)

### ✅ Step 4: Update Serialization to Use New Type - COMPLETED

_Commit: "Update serialization layer to use ObjectiveState" (2c1b4ca)_

- Change `shared/serialized.ts`:
  - `SerializedSeat.status` from `CharacterStatus?` to `ObjectiveState?`
- Update `shared/serialize.ts`:
  - Replace `seat.character?.display.renderStatus(game, seat)` with `getObjectiveState(game, seat)`
- **Test:** Run game, verify serialized status in network traffic

### ✅ Step 5: Update Client to Consume String Literal - COMPLETED

_Commit: "Update client rendering to use ObjectiveStatus string literal" (9bc1e48)_

- Modify `client/PlayerSeat.tsx` to switch on status type instead of checking booleans:
  ```typescript
  switch (status.status) {
    case "complete": return <span className="completed">★</span>;
    case "met": return <span className="success">✓</span>;
    case "failed": return <span className="fail">✗ (impossible)</span>;
    case "pending": return <span className="fail">✗</span>;
  }
  ```
- **Test:** Play full game, verify objective icons render correctly for all states

### ⏳ Step 6: Migrate Characters Incrementally - TODO

_Commits: One per character or small batch_

- Start with simple characters (Gandalf, Pippin, Sam)
- For each character, replace `renderStatus` with `getStatus`:

  ```typescript
  // Before:
  renderStatus: (game, seat) => {
    const met = Character.objective.check(game, seat);
    const completed = Character.objective.isCompleted(game, seat);
    return { met, completable: true, completed };
  };

  // After:
  getStatus: (game, seat) => {
    if (Character.objective.isCompleted(game, seat)) {
      return { status: "complete" };
    }
    if (Character.objective.check(game, seat)) {
      return { status: "met" };
    }
    return { status: "pending" };
  };
  ```

- Move complex characters last (Tom Bombadil, Galadriel, etc.)
- **Test after each:** Run game with that character, verify status displays correctly

### ⏳ Step 7: Clean Up Legacy Code - TODO

_Commit: "Remove renderStatus method and adapter utilities"_

**Remove:**

- `renderStatus` from `CharacterDisplay` interface (make `getStatus` required instead)
- `CharacterStatus` interface entirely
- Adapter utilities:
  - `statusFromBooleans()` - no longer needed
  - `booleansFromStatus()` - was only for testing the adapter
  - `getObjectiveState()` helper - can call `display.getStatus()` directly
- Any references to the old boolean-based system

**Update:**

- `shared/serialize.ts` - call `seat.character?.display.getStatus(game, seat)` directly
- Any other code using `getObjectiveState()` helper

**Test:** Full game suite, all characters work correctly

### ⏳ Step 8: Simplify Character Objective Methods - TODO (Optional Future Work)

_Could be separate PR/issue_

- Consider: Do we still need `check()`, `isCompletable()`, `isCompleted()` as separate methods?
- Could consolidate into single `getStatus()` method on objective itself
- This would eliminate even more duplication

## Benefits

1. **Type Safety:** Impossible states become unrepresentable
2. **Less Duplication:** Each character has one method instead of calling three objective methods
3. **Clearer Intent:** `"complete"` is more explicit than `{met: true, completable: true, completed: true}`
4. **Easier Testing:** String literal makes state machine testing straightforward
5. **Better Serialization:** String literals serialize naturally to JSON (no enum baggage)

## Migration Strategy

- **Steps 1-2:** Create new types and temporary adapters
- **Steps 3-5:** Enable dual-API period (new code can use either old or new)
- **Step 6:** Migrate all characters from `renderStatus` → `getStatus` (one by one)
- **Step 7:** Delete all the scaffolding (adapters, old interface, old types)
- **Step 8:** (Optional) Further simplification

The adapters exist purely to let us test the new system end-to-end before touching character code, then migrate characters incrementally, then throw away the adapters.

## Current Implementation Details

**Files Affected:**

- `shared/types.ts` - Type definitions
- `shared/serialized.ts` - Network boundary types
- `shared/serialize.ts` - Serialization logic
- `shared/utils.ts` - Utility functions
- `shared/characters/types.ts` - Character interfaces
- `shared/characters/*.ts` - 27+ character implementations
- `client/PlayerSeat.tsx` - UI rendering
- `client/game.css` - Status styling

**Key Locations:**

- Boolean trio definition: `shared/types.ts:59-64`
- CharacterDisplay interface: `shared/characters/types.ts:16`
- Serialization call: `shared/serialize.ts:56`
- Client rendering: `client/PlayerSeat.tsx:34-90`
