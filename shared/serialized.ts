// ===== SERIALIZED TYPES FOR NETWORK TRANSMISSION =====
// These types define the boundary for what data gets sent over the network,
// preventing accidental transmission of large object graphs or sensitive data.

import type { Card, Suit, Trick, CharacterStatus } from "./types";

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
 * Serialized representation of a completed trick with its winner.
 */
export interface SerializedCompletedTrick {
  plays: SerializedTrickPlay[];
  winner: number;
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

export type SerializedHand = SerializedPlayerHand | SerializedPyramidHand | SerializedSolitaireHand;

/**
 * Serialized representation of a Seat.
 * Contains only the data needed by clients, not the full Seat object.
 */
export interface SerializedSeat {
  seatIndex: number;
  playerName: string | null;
  character: string | null;
  threatCard: number | null;
  tricksWon: Trick[];
  playedCards: Card[];
  status?: CharacterStatus;
  objective: string;
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
  completedTricks: SerializedCompletedTrick[];
  currentPlayer: number;
  leadPlayer: number;
  currentTrickNumber: number;
  leadSuit: Suit | null;
  ringsBroken: boolean;
  availableCharacters: { name: string; objective: string; setupText: string }[];
  lostCard: Card | null;
  lastTrickWinner: number | null;
  tricksToPlay: number;
}
