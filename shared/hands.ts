// ===== HAND CLASSES =====

import { sortHand } from "./utils";
import type { Card } from "./types";
import type {
  SerializedHand,
  SerializedPlayerHand,
  SerializedPyramidHand,
  SerializedSolitaireHand,
} from "./serialized";

export abstract class Hand {
  abstract addCard(card: Card): void;
  abstract removeCard(card: Card): boolean;
  abstract getAvailableCards(): Card[];
  abstract isEmpty(): boolean;
  abstract getSize(): number;
  abstract getAllCards(): Card[];
  abstract onTrickComplete(): void;
  abstract serializeForViewer(isOwnSeat: boolean): SerializedHand;

  getCards?(): Card[];

  abstract reveal(): void;
  abstract isRevealed(): boolean;
}

export class PlayerHand extends Hand {
  private _cards: Card[];
  private _revealed: boolean;

  constructor(cards: Card[] = []) {
    super();
    this._cards = [...cards];
    this._revealed = false;
  }

  reveal() {
    this._revealed = true;
  }

  isRevealed(): boolean {
    return this._revealed;
  }

  addCard(card: Card): void {
    this._cards.push(card);
  }

  removeCard(card: Card): boolean {
    const index = this._cards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value
    );
    if (index !== -1) {
      this._cards.splice(index, 1);
      return true;
    }
    return false;
  }

  getAvailableCards(): Card[] {
    return [...this._cards];
  }

  isEmpty(): boolean {
    return this._cards.length === 0;
  }

  getSize(): number {
    return this._cards.length;
  }

  getAllCards(): Card[] {
    return [...this._cards];
  }

  getCards(): Card[] {
    return [...this._cards];
  }

  onTrickComplete(): void {
    // No-op for PlayerHand
  }

  serializeForViewer(isOwnSeat: boolean): SerializedPlayerHand {
    return {
      type: "player",
      cards:
        isOwnSeat || this._revealed
          ? sortHand([...this._cards])
          : this._cards.map(() => "hidden"),
    };
  }
}

export class PyramidHand extends Hand {
  private _positions: (Card | null)[];
  private _faceUp: boolean[];
  private _extraCards: Card[];
  private _revealCallback: ((index: number, card: Card) => void) | null;

  constructor(cards: Card[] = []) {
    super();
    this._positions = new Array(12).fill(null);
    this._faceUp = [
      true,
      false,
      true, // row 0 (top)
      false,
      false,
      false,
      false, // row 1 (middle)
      true,
      true,
      true,
      true,
      true, // row 2 (bottom)
    ];
    this._extraCards = [];
    this._revealCallback = null;

    cards.forEach((card, idx) => {
      if (idx < 12) {
        this._positions[idx] = card;
      } else {
        this._extraCards.push(card);
      }
    });
  }

  reveal(): void {
    for (let i = 0; i < this._faceUp.length; i++) {
      this._faceUp[i] = true;
    }
  }

  // Pyramid is always visible to players (it's a shared hand)
  isRevealed(): boolean {
    return true;
  }

  addCard(card: Card): void {
    const emptyIndex = this._positions.findIndex((pos) => pos === null);
    if (emptyIndex !== -1) {
      this._positions[emptyIndex] = card;
    } else {
      this._extraCards.push(card);
    }
  }

  removeCard(card: Card): boolean {
    const extraIndex = this._extraCards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value
    );
    if (extraIndex !== -1) {
      this._extraCards.splice(extraIndex, 1);
      return true;
    }

    const posIndex = this._positions.findIndex(
      (c) => c && c.suit === card.suit && c.value === card.value
    );
    if (posIndex !== -1) {
      this._positions[posIndex] = null;
      // Don't reveal here - wait until trick is complete
      return true;
    }

    return false;
  }

  getAvailableCards(): Card[] {
    const uncoveredIndices = this._getUncoveredIndices();
    const available: Card[] = [];

    uncoveredIndices.forEach((idx) => {
      const card = this._positions[idx];
      if (card) {
        available.push(card);
      }
    });

    available.push(...this._extraCards);
    return available;
  }

  isEmpty(): boolean {
    for (let i = 0; i < 12; i++) {
      if (this._positions[i]) return false;
    }
    return this._extraCards.length === 0;
  }

  getSize(): number {
    let count = 0;
    for (let i = 0; i < 12; i++) {
      if (this._positions[i]) count++;
    }
    return count + this._extraCards.length;
  }

  getAllCards(): Card[] {
    const allCards: Card[] = [];
    for (let i = 0; i < 12; i++) {
      if (this._positions[i]) {
        allCards.push(this._positions[i]!);
      }
    }
    allCards.push(...this._extraCards);
    return allCards;
  }

  onCardRevealed(callback: (index: number, card: Card) => void): void {
    this._revealCallback = callback;
  }

  private _revealNewlyUncoveredCards(): void {
    for (let i = 0; i < 12; i++) {
      if (this._positions[i] && !this._faceUp[i] && !this._isCovered(i)) {
        this._faceUp[i] = true;
        if (this._revealCallback && this._positions[i]) {
          this._revealCallback(i, this._positions[i]!);
        }
      }
    }
  }

  private _isCovered(cardIndex: number): boolean {
    const coveringIndices = this._getCoveringIndices(cardIndex);
    return coveringIndices.some((idx) => this._positions[idx] !== null);
  }

  private _getCoveringIndices(cardIndex: number): number[] {
    if (cardIndex >= 7 && cardIndex <= 11) return [];

    if (cardIndex >= 3 && cardIndex <= 6) {
      const row1Position = cardIndex - 3;
      const covering: number[] = [];
      covering.push(row1Position + 7);
      covering.push(row1Position + 8);
      return covering;
    }

    if (cardIndex >= 0 && cardIndex <= 2) {
      const row0Position = cardIndex;
      const covering: number[] = [];
      covering.push(row0Position + 3);
      covering.push(row0Position + 4);
      return covering;
    }

    return [];
  }

  private _getUncoveredIndices(): number[] {
    const uncovered: number[] = [];
    for (let i = 0; i < 12; i++) {
      if (this._positions[i] && !this._isCovered(i)) {
        uncovered.push(i);
      }
    }
    return uncovered;
  }

  onTrickComplete(): void {
    // Reveal newly uncovered cards after trick is complete
    this._revealNewlyUncoveredCards();
  }

  serializeForViewer(_isOwnSeat: boolean): SerializedPyramidHand {
    // Pyramid is always visible (it's meant to be seen by all)
    // But face-down cards are hidden until revealed
    const positions = this._positions.map((card, idx) => {
      if (card === null) return null;
      return this._faceUp[idx] ? card : "hidden";
    });

    return {
      type: "pyramid",
      positions: positions as (Card | "hidden" | null)[],
      extraCards: this._extraCards, // Extra cards are face-up
    };
  }
}

export class SolitaireHand extends Hand {
  private _revealedCards: Card[];
  private _hiddenCards: Card[];

  reveal() {
    for (const card of this._hiddenCards) {
      this._revealedCards.push(card);
    }
    this._hiddenCards = [];
  }

  // Solitaire is single-player so aside card is always visible to the player
  isRevealed(): boolean {
    return true;
  }

  constructor(cards: Card[] = []) {
    super();
    // In 1-player mode, 1 of Rings is guaranteed to be dealt to seat 0
    this._revealedCards = cards.slice(0, 4);
    this._hiddenCards = cards.slice(4);
  }

  addCard(card: Card): void {
    // Cards added after construction (e.g., during exchanges) are revealed
    this._revealedCards.push(card);
  }

  removeCard(card: Card): boolean {
    const revealedIndex = this._revealedCards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value
    );
    if (revealedIndex !== -1) {
      this._revealedCards.splice(revealedIndex, 1);
      return true;
    }

    const hiddenIndex = this._hiddenCards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value
    );
    if (hiddenIndex !== -1) {
      this._hiddenCards.splice(hiddenIndex, 1);
      return true;
    }

    return false;
  }

  getAvailableCards(): Card[] {
    return [...this._revealedCards];
  }

  isEmpty(): boolean {
    return this._revealedCards.length === 0 && this._hiddenCards.length === 0;
  }

  getSize(): number {
    return this._revealedCards.length + this._hiddenCards.length;
  }

  getAllCards(): Card[] {
    return [...this._revealedCards, ...this._hiddenCards];
  }

  onTrickComplete(): void {
    if (this._hiddenCards.length > 0) {
      const cardToReveal = this._hiddenCards.shift()!;
      this._revealedCards.push(cardToReveal);
    }
  }

  serializeForViewer(_isOwnSeat: boolean): SerializedSolitaireHand {
    // In solitaire mode, all seats are controlled by the same player
    // So we always show revealed cards and hide the hidden ones
    const cards: (Card | "hidden")[] = [
      ...this._revealedCards,
      ...this._hiddenCards.map(() => "hidden" as const),
    ];

    return {
      type: "solitaire",
      cards,
    };
  }
}
