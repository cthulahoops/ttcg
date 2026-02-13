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

  takeCard(target: Card): Card {
    const index = this.cards.findIndex(
      (c) => c.suit === target.suit && c.value === target.value
    );
    if (index < 0) {
      throw new Error(
        `Card ${target.value} of ${target.suit} not found in deck`
      );
    }
    return this.cards.splice(index, 1)[0]!;
  }

  get length() {
    return this.cards.length;
  }
}
