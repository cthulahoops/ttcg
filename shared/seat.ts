// ===== SEAT CLASS =====
// Represents a player position/seat in the game

import type { Game } from "./game";
import type { Hand } from "./hands";
import type { Card, ObjectiveStatus, Trick, Controller } from "./types";
import type { CharacterDefinition } from "./characters/types";
import type { RiderDefinition } from "./riders/types";
import { achieveBoth } from "./objectives";
import { seatLabel } from "./seat-label";

export class Seat {
  seatIndex: number;
  hand: Hand;
  character: CharacterDefinition | null;
  rider: RiderDefinition | null;
  threatCard: number | null;
  tricksWon: Trick[];
  playedCards: Card[];
  controller: Controller;
  isPyramid: boolean;
  asideCard: Card | null; // Card set aside by Shadowfax

  constructor(
    seatIndex: number,
    controller: Controller,
    hand: Hand,
    isPyramid: boolean
  ) {
    this.seatIndex = seatIndex;
    this.hand = hand; // Hand instance
    this.character = null; // Character definition from registry
    this.rider = null; // Rider definition from registry
    this.threatCard = null; // Threat card number or null
    this.tricksWon = []; // Array of { number: number, cards: Card[] }
    this.playedCards = []; // Array of cards played by this seat
    this.controller = controller; // "human" | "ai"
    this.isPyramid = isPyramid; // Flag for 2-player pyramid seat
    this.asideCard = null; // Card set aside by Shadowfax
  }

  // Display helper - encapsulates complex display logic
  getDisplayName(playerCount: number): string {
    return seatLabel(this, playerCount);
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

  getObjectiveStatus(game: Game): ObjectiveStatus {
    const characterStatus = this.character!.objective.getStatus(game, this);
    const riderStatus = this.rider?.objective.getStatus(game, this);

    return riderStatus
      ? achieveBoth(characterStatus, riderStatus)
      : characterStatus;
  }
}
