// ===== PURE UTILITY FUNCTIONS =====
// (No DOM dependencies - safe for both server and client)

import type { Card, ObjectiveStatus, Suit } from "./types";

/**
 * Combines two objective statuses where both must be achieved.
 * - Outcome: success only if both are success
 * - Finality: final if either is {final, failure} OR both are final
 */
export function bothAchieved(
  s1: ObjectiveStatus,
  s2: ObjectiveStatus
): ObjectiveStatus {
  const isFinalFailure = (s: ObjectiveStatus) =>
    s.finality === "final" && s.outcome === "failure";

  const outcome: ObjectiveStatus["outcome"] =
    s1.outcome === "success" && s2.outcome === "success"
      ? "success"
      : "failure";

  const finality: ObjectiveStatus["finality"] =
    isFinalFailure(s1) ||
    isFinalFailure(s2) ||
    (s1.finality === "final" && s2.finality === "final")
      ? "final"
      : "tentative";

  return { finality, outcome };
}

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
