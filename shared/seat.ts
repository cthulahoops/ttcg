// ===== SEAT CLASS =====
// Represents a player position/seat in the game

import type { Hand } from "./hands";
import type { Card, Trick, Controller } from "./types";
import type { CharacterDefinition } from "./characters/types";

/**
 * A Seat that has been initialized with a hand.
 * After game setup, all seats have hands - use this type to avoid null checks.
 */
export type InitializedSeat = Seat & { hand: Hand };

/**
 * Type guard to narrow Seat to InitializedSeat.
 * Use this at game logic boundaries where hand is guaranteed to exist.
 */
export function hasHand(seat: Seat): seat is InitializedSeat {
  return seat.hand !== null;
}

/**
 * Asserts that a seat has a hand and returns it as InitializedSeat.
 * Throws if hand is null (indicates a programming error - game logic
 * should only run after hands are initialized).
 */
export function requireHand(seat: Seat): InitializedSeat {
  if (!hasHand(seat)) {
    throw new Error(`Seat ${seat.seatIndex} has no hand - game not properly initialized`);
  }
  return seat;
}

export class Seat {
  seatIndex: number;
  hand: Hand | null;
  character: CharacterDefinition | null;
  threatCard: number | null;
  tricksWon: Trick[];
  playedCards: Card[];
  controller: Controller;
  isPyramid: boolean;

  constructor(seatIndex: number, controller: Controller) {
    this.seatIndex = seatIndex;
    this.hand = null; // Hand instance (set after creation)
    this.character = null; // Character definition from registry
    this.threatCard = null; // Threat card number or null
    this.tricksWon = []; // Array of { number: number, cards: Card[] }
    this.playedCards = []; // Array of cards played by this seat
    this.controller = controller; // "human" | "ai"
    this.isPyramid = false; // Flag for 2-player pyramid seat
  }

  // Display helper - encapsulates complex display logic
  getDisplayName(): string {
    if (this.character) {
      if (this.isPyramid) {
        return `${this.character.name} (Pyramid)`;
      } else {
        return this.character.name;
      }
    } else {
      // Use player name if available, otherwise fall back to "Player X"
      const baseName = this.controller.playerName ?? `Player ${this.seatIndex + 1}`;
      if (this.isPyramid) {
        return `${baseName} (Pyramid)`;
      } else {
        return baseName;
      }
    }
  }

  addTrick(number: number, cards: Card[]): void {
    this.tricksWon.push({
      number: number,
      cards: cards,
    });
  }

  getTrickCount(): number {
    return this.tricksWon.length;
  }

  getAllWonCards(): Card[] {
    return this.tricksWon.flatMap((trick) => trick.cards);
  }
}
