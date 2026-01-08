// ===== HAND CLASSES =====

import { sortHand, createCardElement } from "./utils";
import type { Card } from "./types";

export abstract class Hand {
  abstract addCard(card: Card): void;
  abstract removeCard(card: Card): boolean;
  abstract getAvailableCards(): Card[];
  abstract isEmpty(): boolean;
  abstract getSize(): number;
  abstract render(
    domElement: HTMLElement,
    isPlayable: (card: Card) => boolean,
    onClick: (card: Card) => void,
  ): void;
  abstract getAllCards(): Card[];
  abstract onTrickComplete(): void;

  // Some hands expose this method (PlayerHand, HiddenHand)
  getCards?(): Card[];

  revealed(): Hand {
    return new PlayerHand(this.getAllCards());
  }
}

export class PlayerHand extends Hand {
  private _cards: Card[];

  constructor(cards: Card[] = []) {
    super();
    this._cards = [...cards];
  }

  addCard(card: Card): void {
    this._cards.push(card);
  }

  removeCard(card: Card): boolean {
    const index = this._cards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value,
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

  render(
    domElement: HTMLElement,
    isPlayable: (card: Card) => boolean,
    onClick: (card: Card) => void,
  ): void {
    domElement.innerHTML = "";
    domElement.classList.remove("pyramid-hand");

    const sorted = sortHand([...this._cards]);

    sorted.forEach((card) => {
      const canPlay = isPlayable(card);
      const cardElement = createCardElement(
        card,
        canPlay,
        canPlay ? () => onClick(card) : null,
      );

      if (!canPlay) {
        cardElement.classList.add("disabled");
      }

      domElement.appendChild(cardElement);
    });
  }

  onTrickComplete(): void {
    // No-op for PlayerHand
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

    // Initialize with cards
    cards.forEach((card, idx) => {
      if (idx < 12) {
        this._positions[idx] = card;
      } else {
        this._extraCards.push(card);
      }
    });
  }

  revealed(): Hand {
    for (let i = 0; i < this._faceUp.length; i++) {
      this._faceUp[i] = true;
    }
    return this;
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
    // Check extra cards first
    const extraIndex = this._extraCards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value,
    );
    if (extraIndex !== -1) {
      this._extraCards.splice(extraIndex, 1);
      return true;
    }

    // Check pyramid positions
    const posIndex = this._positions.findIndex(
      (c) => c && c.suit === card.suit && c.value === card.value,
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
    // Bottom row (7-11): not covered
    if (cardIndex >= 7 && cardIndex <= 11) return [];

    // Middle row (3-6): covered by bottom row
    if (cardIndex >= 3 && cardIndex <= 6) {
      const row1Position = cardIndex - 3;
      const covering: number[] = [];
      covering.push(row1Position + 7); // Left covering card
      covering.push(row1Position + 8); // Right covering card
      return covering;
    }

    // Top row (0-2): covered by middle row
    if (cardIndex >= 0 && cardIndex <= 2) {
      const row0Position = cardIndex;
      const covering: number[] = [];
      covering.push(row0Position + 3); // Left covering card
      covering.push(row0Position + 4); // Right covering card
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

  render(
    domElement: HTMLElement,
    isPlayable: (card: Card) => boolean,
    onClick: (card: Card) => void,
  ): void {
    domElement.innerHTML = "";
    domElement.classList.add("pyramid-hand");

    const uncoveredIndices = this._getUncoveredIndices();
    const rows = [
      { start: 0, count: 3 }, // Top row
      { start: 3, count: 4 }, // Middle row
      { start: 7, count: 5 }, // Bottom row
    ];

    rows.forEach((rowInfo, rowIdx) => {
      for (let colIdx = 0; colIdx < rowInfo.count; colIdx++) {
        const cardIdx = rowInfo.start + colIdx;
        const card = this._positions[cardIdx];

        if (!card) continue;

        const isFaceUp = this._faceUp[cardIdx];
        const isUncovered = uncoveredIndices.includes(cardIdx);

        let cardElement: HTMLDivElement;

        if (isFaceUp) {
          const canPlay = isPlayable(card);
          cardElement = createCardElement(
            card,
            canPlay,
            canPlay ? () => onClick(card) : null,
          );

          cardElement.classList.add(
            isUncovered ? "pyramid-uncovered" : "pyramid-covered",
          );

          if (!canPlay) {
            cardElement.classList.add("disabled");
          }
        } else {
          // Face-down card
          cardElement = document.createElement("div");
          cardElement.className = "card pyramid-face-down";
          if (!isUncovered) cardElement.classList.add("pyramid-covered");

          const valueDiv = document.createElement("div");
          valueDiv.className = "value";
          valueDiv.textContent = "?";
          cardElement.appendChild(valueDiv);
        }

        cardElement.style.gridRow = `${rowIdx + 1} / span 2`;
        cardElement.style.gridColumn = `${2 * colIdx + (3 - rowIdx)} / span 2`;

        domElement.appendChild(cardElement);
      }
    });

    // Render extra cards
    this._extraCards.forEach((card, idx) => {
      const canPlay = isPlayable(card);
      const cardElement = createCardElement(
        card,
        canPlay,
        canPlay ? () => onClick(card) : null,
      );
      cardElement.classList.add("pyramid-extra");

      if (!canPlay) {
        cardElement.classList.add("disabled");
      }

      cardElement.style.gridRow = `${3} / span 2`;
      cardElement.style.gridColumn = `${2 * (idx + 5) + 1} / span 2`;

      domElement.appendChild(cardElement);
    });
  }

  onTrickComplete(): void {
    // Reveal newly uncovered cards after trick is complete
    this._revealNewlyUncoveredCards();
  }
}

export class HiddenHand extends Hand {
  private _wrappedHand: PlayerHand;

  constructor(cards: Card[] = []) {
    super();
    this._wrappedHand = new PlayerHand(cards);
  }

  addCard(card: Card): void {
    this._wrappedHand.addCard(card);
  }

  removeCard(card: Card): boolean {
    return this._wrappedHand.removeCard(card);
  }

  getAvailableCards(): Card[] {
    return this._wrappedHand.getAvailableCards();
  }

  isEmpty(): boolean {
    return this._wrappedHand.isEmpty();
  }

  getSize(): number {
    return this._wrappedHand.getSize();
  }

  getAllCards(): Card[] {
    return this._wrappedHand.getAllCards();
  }

  getCards(): Card[] {
    return this._wrappedHand.getCards();
  }

  render(
    domElement: HTMLElement,
    _isPlayable: (card: Card) => boolean,
    _onClick: (card: Card) => void,
  ): void {
    domElement.innerHTML = "";
    domElement.classList.remove("pyramid-hand");

    const handSize = this.getSize();

    for (let i = 0; i < handSize; i++) {
      const cardBack = document.createElement("div");
      cardBack.className = "card hidden";
      const valueDiv = document.createElement("div");
      valueDiv.className = "value";
      valueDiv.textContent = "?";
      cardBack.appendChild(valueDiv);
      domElement.appendChild(cardBack);
    }
  }

  // Expose wrapped hand for direct access if needed
  unwrap(): PlayerHand {
    return this._wrappedHand;
  }

  onTrickComplete(): void {
    // Delegate to wrapped hand
    this._wrappedHand.onTrickComplete();
  }
}

export class SolitaireHand extends Hand {
  private _revealedCards: Card[];
  private _hiddenCards: Card[];

  constructor(cards: Card[] = []) {
    super();
    // Ensure 1 of Rings is in the initially revealed cards
    SolitaireHand._ensureOneRingRevealed(cards);
    // Initialize with first 4 cards revealed, rest hidden
    this._revealedCards = cards.slice(0, 4);
    this._hiddenCards = cards.slice(4);
  }

  private static _ensureOneRingRevealed(cards: Card[]): void {
    // Swap 1 of Rings to one of the first 4 positions if needed
    const oneRingIndex = cards.findIndex(
      (c) => c.suit === "rings" && c.value === 1,
    );
    if (oneRingIndex >= 4) {
      [cards[3], cards[oneRingIndex]] = [cards[oneRingIndex], cards[3]];
    }
  }

  addCard(card: Card): void {
    // Cards added after construction (e.g., during exchanges) are revealed
    this._revealedCards.push(card);
  }

  removeCard(card: Card): boolean {
    // Try to remove from revealed cards first
    const revealedIndex = this._revealedCards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value,
    );
    if (revealedIndex !== -1) {
      this._revealedCards.splice(revealedIndex, 1);
      return true;
    }

    // Try to remove from hidden cards
    const hiddenIndex = this._hiddenCards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value,
    );
    if (hiddenIndex !== -1) {
      this._hiddenCards.splice(hiddenIndex, 1);
      return true;
    }

    return false;
  }

  getAvailableCards(): Card[] {
    // Only revealed cards are available to play
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
    // Reveal one more card after each trick (if any hidden cards remain)
    if (this._hiddenCards.length > 0) {
      const cardToReveal = this._hiddenCards.shift()!;
      this._revealedCards.push(cardToReveal);
    }
  }

  render(
    domElement: HTMLElement,
    isPlayable: (card: Card) => boolean,
    onClick: (card: Card) => void,
  ): void {
    domElement.innerHTML = "";
    domElement.classList.remove("pyramid-hand");
    domElement.classList.add("solitaire-hand");

    // Render revealed cards
    this._revealedCards.forEach((card) => {
      const canPlay = isPlayable(card);
      const cardElement = createCardElement(
        card,
        canPlay,
        canPlay ? () => onClick(card) : null,
      );

      if (!canPlay) {
        cardElement.classList.add("disabled");
      }

      domElement.appendChild(cardElement);
    });

    // Render hidden cards as face-down
    this._hiddenCards.forEach(() => {
      const cardBack = document.createElement("div");
      cardBack.className = "card hidden";
      const valueDiv = document.createElement("div");
      valueDiv.className = "value";
      valueDiv.textContent = "?";
      cardBack.appendChild(valueDiv);
      domElement.appendChild(cardBack);
    });
  }
}
