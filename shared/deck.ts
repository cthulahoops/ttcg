import { Card } from "./types";
import { CARDS_PER_SUIT, SUITS } from "./types";
import { shuffleDeck } from "./utils";

export class Deck {
  private cards: Card[] = [];

  constructor() {
    for (const suit of SUITS) {
      for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
        this.cards.push({ suit, value });
      }
    }
  }

  shuffle() {
    this.cards = shuffleDeck(this.cards);
  }

  draw() {
    return this.cards.shift();
  }
}
