/**
 * Test utilities for creating valid game states.
 *
 * The GameStateBuilder ensures all 37 cards are accounted for (hands + tricks + lost card)
 * and provides implementation-agnostic tests that work regardless of how objectives count cards.
 */

import { Game } from "./game";
import { Seat } from "./seat";
import { PlayerHand } from "./hands";
import { Controller } from "./controllers";
import { characterRegistry } from "./characters/registry";
import type { Card } from "./types";
import { SUITS, CARDS_PER_SUIT } from "./types";

// ===== TEST CONTROLLER =====

/**
 * Minimal controller for testing - throws on any method call.
 */
export class TestController extends Controller {
  async chooseButton<T>(): Promise<T> {
    throw new Error("Not implemented in test");
  }
  async chooseCard<T>(): Promise<T> {
    throw new Error("Not implemented in test");
  }
  async selectCard(): Promise<Card> {
    throw new Error("Not implemented in test");
  }
}

// ===== FULL DECK CONSTANT =====

/**
 * Generate the full 37-card deck.
 */
export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

// ===== CARD UTILITIES =====

function cardKey(card: Card): string {
  return `${card.suit}-${card.value}`;
}

function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.value === b.value;
}

function isValidCard(card: Card): boolean {
  if (!SUITS.includes(card.suit)) return false;
  const maxValue = CARDS_PER_SUIT[card.suit];
  return card.value >= 1 && card.value <= maxValue;
}

/**
 * Sort cards by suit order (mountains, shadows, forests, hills, rings) then by value.
 */
function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    if (suitOrder !== 0) return suitOrder;
    return a.value - b.value;
  });
}

// ===== GAME STATE BUILDER =====

interface WonCardsSpec {
  seatIndex: number;
  cards: Card[];
}

interface WonTrickSpec {
  seatIndex: number;
  cards: Card[];
}

interface WonTricksSpec {
  seatIndex: number;
  count: number;
}

export class GameStateBuilder {
  private numPlayers: 3 | 4;
  private lostCard: Card | null = null;
  private characterAssignments: Map<number, string> = new Map();
  private wonCardsSpecs: WonCardsSpec[] = [];
  private wonTrickSpecs: WonTrickSpec[] = [];
  private wonTricksSpecs: WonTricksSpec[] = [];
  private shouldFinishGame = false;

  constructor(numPlayers: 3 | 4) {
    this.numPlayers = numPlayers;
  }

  /**
   * Set the lost card explicitly.
   * If not called, defaults to mountains-1 (or first non-ring if that's used).
   */
  withLostCard(card: Card): this {
    this.lostCard = card;
    return this;
  }

  /**
   * Assign a character to a seat.
   */
  setCharacter(seatIndex: number, name: string): this {
    if (seatIndex < 0 || seatIndex >= this.numPlayers) {
      throw new Error(`Invalid seat index: ${seatIndex}`);
    }
    this.characterAssignments.set(seatIndex, name);
    return this;
  }

  /**
   * Specify cards that a seat has won.
   * Only specify the cards relevant to your test - the builder handles the rest.
   * Cards are lazily evaluated at build() time.
   * Note: Each card creates a separate trick. Use seatWonTrick() if you need
   * multiple specific cards in a single trick.
   */
  seatWonCards(seatIndex: number, cards: Card[]): this {
    if (seatIndex < 0 || seatIndex >= this.numPlayers) {
      throw new Error(`Invalid seat index: ${seatIndex}`);
    }
    this.wonCardsSpecs.push({ seatIndex, cards });
    return this;
  }

  /**
   * Specify a single trick with specific cards that a seat has won.
   * Use this when you need multiple specific cards in one trick (e.g., testing
   * that multiple hills cards in one trick count as one trick, not multiple).
   */
  seatWonTrick(seatIndex: number, cards: Card[]): this {
    if (seatIndex < 0 || seatIndex >= this.numPlayers) {
      throw new Error(`Invalid seat index: ${seatIndex}`);
    }
    this.wonTrickSpecs.push({ seatIndex, cards });
    return this;
  }

  /**
   * Specify how many tricks a seat has won (auto-filled with available cards).
   * Use this when you only care about trick counts, not specific cards.
   */
  seatWonTricks(seatIndex: number, count: number): this {
    if (seatIndex < 0 || seatIndex >= this.numPlayers) {
      throw new Error(`Invalid seat index: ${seatIndex}`);
    }
    this.wonTricksSpecs.push({ seatIndex, count });
    return this;
  }

  /**
   * Mark the game as finished - all cards will be in tricks, none in hands.
   */
  finishGame(): this {
    this.shouldFinishGame = true;
    return this;
  }

  /**
   * Build the game state.
   * Validates all specifications and distributes remaining cards.
   */
  build(): { game: Game; seats: Seat[] } {
    const cardsPerPlayer = this.numPlayers === 3 ? 12 : 9;

    // Step 1: Determine and validate lost card
    const lostCard = this.determineLostCard();

    // Step 2: Collect and validate all specified won cards
    const allSpecifiedCards = this.collectAndValidateSpecifiedCards(lostCard);

    // Step 3: Create the remaining deck (full deck - lost card - specified cards)
    const remainingDeck = this.createRemainingDeck(lostCard, allSpecifiedCards);

    // Step 4: Create seats with empty hands
    const seats = this.createSeats();

    // Step 5: Create the game
    const game = new Game(
      this.numPlayers,
      this.numPlayers,
      seats,
      lostCard,
      0 // startPlayer
    );

    // Step 6: Assign characters
    for (const [seatIndex, characterName] of this.characterAssignments) {
      const character = characterRegistry.get(characterName);
      if (!character) {
        throw new Error(`Unknown character: ${characterName}`);
      }
      seats[seatIndex]!.character = character;
    }

    // Step 7: Group won cards into valid tricks and assign to seats
    this.assignWonCardsTricks(game, seats, remainingDeck);

    // Step 7b: Assign single tricks with specific cards (from seatWonTrick)
    this.assignWonTrickSpecs(game, seats, remainingDeck);

    // Step 8: Assign auto-filled tricks (from seatWonTricks)
    this.assignAutoFilledTricks(game, seats, remainingDeck);

    // Step 9: Distribute remaining cards to hands or more tricks
    if (this.shouldFinishGame) {
      this.distributeRemainingToTricks(game, seats, remainingDeck);
    } else {
      this.distributeRemainingToHands(seats, remainingDeck, cardsPerPlayer);
    }

    return { game, seats };
  }

  private determineLostCard(): Card {
    if (this.lostCard) {
      this.validateLostCard(this.lostCard);
      return this.lostCard;
    }

    // Default: mountains-1, unless that card is specified as won
    const defaultLostCard: Card = { suit: "mountains", value: 1 };
    const isDefaultUsed = this.wonCardsSpecs.some((spec) =>
      spec.cards.some((c) => cardsEqual(c, defaultLostCard))
    );

    if (!isDefaultUsed) {
      return defaultLostCard;
    }

    // Find first non-ring card not specified as won
    const fullDeck = createFullDeck();
    for (const card of fullDeck) {
      if (card.suit === "rings") continue;
      const isUsed = this.wonCardsSpecs.some((spec) =>
        spec.cards.some((c) => cardsEqual(c, card))
      );
      if (!isUsed) {
        return card;
      }
    }

    throw new Error(
      "Cannot determine lost card - all non-ring cards are specified as won"
    );
  }

  private validateLostCard(card: Card): void {
    if (!isValidCard(card)) {
      throw new Error(`Invalid lost card: ${card.suit}-${card.value}`);
    }
    if (card.suit === "rings" && card.value === 1) {
      throw new Error("Lost card cannot be the 1 of Rings");
    }
  }

  private collectAndValidateSpecifiedCards(lostCard: Card): Set<string> {
    const seenCards = new Set<string>();
    seenCards.add(cardKey(lostCard)); // Lost card is "used"

    // Check wonCardsSpecs
    for (const spec of this.wonCardsSpecs) {
      for (const card of spec.cards) {
        // Validate card exists
        if (!isValidCard(card)) {
          throw new Error(`Invalid card specified: ${card.suit}-${card.value}`);
        }

        // Check for duplicates
        const key = cardKey(card);
        if (seenCards.has(key)) {
          throw new Error(
            `Duplicate card specified: ${card.suit}-${card.value}`
          );
        }
        seenCards.add(key);
      }
    }

    // Check wonTrickSpecs (single tricks with multiple specific cards)
    for (const spec of this.wonTrickSpecs) {
      for (const card of spec.cards) {
        if (!isValidCard(card)) {
          throw new Error(`Invalid card specified: ${card.suit}-${card.value}`);
        }

        const key = cardKey(card);
        if (seenCards.has(key)) {
          throw new Error(
            `Duplicate card specified: ${card.suit}-${card.value}`
          );
        }
        seenCards.add(key);
      }
    }

    return seenCards;
  }

  private createRemainingDeck(lostCard: Card, usedCards: Set<string>): Card[] {
    const fullDeck = createFullDeck();
    return fullDeck.filter((card) => {
      if (cardsEqual(card, lostCard)) return false;
      return !usedCards.has(cardKey(card));
    });
  }

  private createSeats(): Seat[] {
    const seats: Seat[] = [];
    for (let i = 0; i < this.numPlayers; i++) {
      const controller = new TestController();
      const hand = new PlayerHand();
      seats.push(new Seat(i, controller, hand, false));
    }
    return seats;
  }

  private assignWonCardsTricks(
    game: Game,
    seats: Seat[],
    remainingDeck: Card[]
  ): void {
    // Group cards by seat
    const cardsBySeat: Map<number, Card[]> = new Map();
    for (let i = 0; i < this.numPlayers; i++) {
      cardsBySeat.set(i, []);
    }

    for (const spec of this.wonCardsSpecs) {
      const seatCards = cardsBySeat.get(spec.seatIndex)!;
      seatCards.push(...spec.cards);
    }

    // Build tricks: each trick needs numPlayers cards
    // We'll create one trick per "important" card, filling with auto-fill cards
    let trickNumber = 0;

    for (const spec of this.wonCardsSpecs) {
      const seat = seats[spec.seatIndex]!;

      // For each specified card, we need to put it in a trick
      // Group specified cards into tricks of size numPlayers
      for (const specifiedCard of spec.cards) {
        const trickCards: Card[] = [specifiedCard];

        // Fill the rest of the trick with cards from remaining deck
        while (
          trickCards.length < this.numPlayers &&
          remainingDeck.length > 0
        ) {
          trickCards.push(remainingDeck.shift()!);
        }

        // If we couldn't fill the trick, that's okay - we'll have partial tricks
        // This happens when there aren't enough remaining cards
        if (trickCards.length > 0) {
          seat.addTrick(trickNumber, trickCards);
          trickNumber++;
        }
      }
    }

    // Update game's trick counter
    game.currentTrickNumber = trickNumber;
  }

  private assignWonTrickSpecs(
    game: Game,
    seats: Seat[],
    remainingDeck: Card[]
  ): void {
    for (const spec of this.wonTrickSpecs) {
      const seat = seats[spec.seatIndex]!;
      const trickCards: Card[] = [...spec.cards];

      // Fill the rest of the trick with cards from remaining deck
      while (trickCards.length < this.numPlayers && remainingDeck.length > 0) {
        trickCards.push(remainingDeck.shift()!);
      }

      if (trickCards.length > 0) {
        seat.addTrick(game.currentTrickNumber, trickCards);
        game.currentTrickNumber++;
      }
    }
  }

  private assignAutoFilledTricks(
    game: Game,
    seats: Seat[],
    remainingDeck: Card[]
  ): void {
    for (const spec of this.wonTricksSpecs) {
      const seat = seats[spec.seatIndex]!;

      for (let i = 0; i < spec.count; i++) {
        const trickCards: Card[] = [];

        // Fill the trick with cards from remaining deck
        for (let j = 0; j < this.numPlayers && remainingDeck.length > 0; j++) {
          trickCards.push(remainingDeck.shift()!);
        }

        if (trickCards.length > 0) {
          seat.addTrick(game.currentTrickNumber, trickCards);
          game.currentTrickNumber++;
        }
      }
    }
  }

  private distributeRemainingToTricks(
    game: Game,
    seats: Seat[],
    remainingDeck: Card[]
  ): void {
    // Sort remaining cards for deterministic distribution
    const sortedRemaining = sortCards(remainingDeck);
    let seatIndex = 0;

    while (sortedRemaining.length > 0) {
      const trickCards: Card[] = [];

      // Take numPlayers cards for this trick
      for (let i = 0; i < this.numPlayers && sortedRemaining.length > 0; i++) {
        trickCards.push(sortedRemaining.shift()!);
      }

      if (trickCards.length > 0) {
        // Assign trick to next seat in round-robin fashion
        const seat = seats[seatIndex % this.numPlayers]!;
        seat.addTrick(game.currentTrickNumber, trickCards);
        game.currentTrickNumber++;
        seatIndex++;
      }
    }

    // Ensure game.finished returns true by making hands empty
    // (hands are already empty since we didn't distribute to them)
  }

  private distributeRemainingToHands(
    seats: Seat[],
    remainingDeck: Card[],
    _cardsPerPlayer: number
  ): void {
    // Sort remaining cards for deterministic distribution
    const sortedRemaining = sortCards(remainingDeck);

    // Deal round-robin to seats
    let seatIndex = 0;
    for (const card of sortedRemaining) {
      seats[seatIndex]!.hand.addCard(card);
      seatIndex = (seatIndex + 1) % this.numPlayers;
    }
  }
}
