// ===== SEAT CLASS =====
// Represents a player position/seat in the game

import type { Hand } from "./hands";
import type { Card, Trick, Controller } from "./types";
import type { CharacterDefinition } from "./characters/types";

export class Seat {
  seatIndex: number;
  hand: Hand | null;
  character: string | null;
  characterDef: CharacterDefinition | null;
  threatCard: number | null;
  tricksWon: Trick[];
  playedCards: Card[];
  controller: Controller;
  isPyramid: boolean;

  constructor(seatIndex: number, controller: Controller) {
    this.seatIndex = seatIndex;
    this.hand = null; // Hand instance (set after creation)
    this.character = null; // Character name or null
    this.characterDef = null; // Character definition from registry (cached)
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
        return `${this.character} (Pyramid)`;
      } else {
        return this.character;
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
