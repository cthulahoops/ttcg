// ===== SERIALIZED TYPES FOR NETWORK TRANSMISSION =====
// These types define the boundary for what data gets sent over the network,
// preventing accidental transmission of large object graphs or sensitive data.

import type { Card, Suit, Trick } from "./types";

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
 * Serialized hand types that preserve positional information
 * while allowing cards to be hidden from non-viewing seats.
 */
export type SerializedPlayerHand = {
  type: "player";
  cards: (Card | "hidden")[];
};

export type SerializedPyramidHand = {
  type: "pyramid";
  positions: (Card | "hidden" | null)[]; // 12 positions, null = empty
  extraCards: (Card | "hidden")[]; // Any cards beyond the pyramid
};

export type SerializedSolitaireHand = {
  type: "solitaire";
  cards: (Card | "hidden")[]; // Revealed cards first, then hidden
};

export type SerializedHand =
  | SerializedPlayerHand
  | SerializedPyramidHand
  | SerializedSolitaireHand;

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
  // Hand data with position information preserved
  // The hand type ("pyramid", "solitaire", "player") replaces the old isPyramid flag
  hand: SerializedHand | null;
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
  leadPlayer: number;
  currentTrickNumber: number;
  leadSuit: Suit | null;
  ringsBroken: boolean;
  availableCharacters: string[];
  lostCard: Card | null;
  lastTrickWinner: number | null;
  threatDeck: number[]; // Length only visible, or full deck for specific views
  tricksToPlay: number;
}
