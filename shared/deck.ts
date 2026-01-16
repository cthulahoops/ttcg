import { Card } from "./types";
import { CARDS_PER_SUIT, SUITS } from "./types";

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
      deck.push({ suit, value });
    }
  }

  return deck;
}
