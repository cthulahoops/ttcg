// ===== PURE UTILITY FUNCTIONS =====
// (No DOM dependencies - safe for both server and client)

import type { Card, Suit, ObjectiveStatus, ObjectiveState } from "./types";
import type { Game } from "./game";
import type { Seat } from "./seat";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sortHand(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    mountains: 0,
    shadows: 1,
    forests: 2,
    hills: 3,
    rings: 4,
  };

  return cards.sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
}

export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * Converts boolean objective flags to ObjectiveStatus enum.
 * Priority: completed > failed > met > pending
 */
export function statusFromBooleans(
  met: boolean,
  completable: boolean,
  completed: boolean
): ObjectiveStatus {
  if (completed) {
    return "complete";
  }
  if (!completable) {
    return "failed";
  }
  if (met) {
    return "met";
  }
  return "pending";
}

/**
 * Gets the objective state for a seat, preferring the new getStatus API
 * and falling back to the legacy renderStatus API with adapter.
 */
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
