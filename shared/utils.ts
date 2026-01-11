// ===== PURE UTILITY FUNCTIONS =====
// (No DOM dependencies - safe for both server and client)

import type { Card, Suit } from "./types.js";

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
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
