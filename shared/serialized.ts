// ===== SERIALIZED TYPES FOR NETWORK TRANSMISSION =====
// These types define the boundary for what data gets sent over the network,
// preventing accidental transmission of large object graphs or sensitive data.

import type { Card, Suit, Trick } from "./types.js";

/**
 * Serialized representation of a trick play.
 * Only includes seatIndex and card to reduce payload and avoid
 * accidental hand leakage if Seat contains a hand reference.
 */
export interface SerializedTrickPlay {
  seatIndex: number;
  card: Card;
  isTrump: boolean;
}

/**
 * Serialized representation of a Seat.
 * Contains only the data needed by clients, not the full Seat object.
 */
export interface SerializedSeat {
  seatIndex: number;
  character: string | null;
  threatCard: number | null;
  tricksWon: Trick[];
  playedCards: Card[];
  isPyramid: boolean;
  // Hand data - only what the viewing seat is allowed to see
  handSize: number; // Total number of cards in hand
  visibleCards?: Card[]; // Only included if this seat's cards are visible to the viewer
}

/**
 * Serialized representation of the Game state.
 * Contains only the data needed by a specific seat (player),
 * filtered to hide information that should not be visible.
 */
export interface SerializedGame {
  playerCount: number;
  numCharacters: number;
  seats: SerializedSeat[];
  currentTrick: SerializedTrickPlay[];
  currentPlayer: number;
  currentTrickNumber: number;
  leadSuit: Suit | null;
  ringsBroken: boolean;
  availableCharacters: string[];
  lostCard: Card | null;
  lastTrickWinner: number | null;
  threatDeck: number[]; // Length only visible, or full deck for specific views
  tricksToPlay: number;
}
