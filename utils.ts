// ===== UTILITY FUNCTIONS =====

import type { Card, Suit } from "./types";

// Re-export for convenience
export type { Card, Suit };

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
    // First sort by suit
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    // Then by value within the same suit
    return a.value - b.value;
  });
}

export function createCardElement(
  card: Card,
  clickable = false,
  clickHandler: (() => void) | null = null,
): HTMLDivElement {
  const cardDiv = document.createElement("div");
  cardDiv.className = `card ${card.suit}`;
  if (clickable) {
    cardDiv.classList.add("clickable");
    if (clickHandler) {
      cardDiv.onclick = clickHandler;
    }
  }

  const valueDiv = document.createElement("div");
  valueDiv.className = "value";
  valueDiv.textContent = card.value.toString();

  const suitDiv = document.createElement("div");
  suitDiv.className = "suit";
  suitDiv.textContent = card.suit;

  cardDiv.appendChild(valueDiv);
  cardDiv.appendChild(suitDiv);

  return cardDiv;
}

export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
