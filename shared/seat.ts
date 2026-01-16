// ===== SEAT CLASS =====
// Represents a player position/seat in the game

import type { Hand } from "./hands";
import type { Card, Trick, Controller } from "./types";
import type { CharacterDefinition } from "./characters/types";

export class Seat {
  seatIndex: number;
  hand: Hand;
  character: CharacterDefinition | null;
  threatCard: number | null;
  tricksWon: Trick[];
  playedCards: Card[];
  controller: Controller;
  isPyramid: boolean;

  constructor(seatIndex: number, controller: Controller, hand: Hand, isPyramid: boolean) {
    this.seatIndex = seatIndex;
    this.hand = hand; // Hand instance
    this.character = null; // Character definition from registry
    this.threatCard = null; // Threat card number or null
    this.tricksWon = []; // Array of { number: number, cards: Card[] }
    this.playedCards = []; // Array of cards played by this seat
    this.controller = controller; // "human" | "ai"
    this.isPyramid = isPyramid; // Flag for 2-player pyramid seat
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
