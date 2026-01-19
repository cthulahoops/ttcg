// ===== SHARED TYPE DEFINITIONS =====

import type { Controller, AIController } from "./controllers";

export type Suit = "mountains" | "shadows" | "forests" | "hills" | "rings";

/** Number of cards in each suit (8 for normal suits, 5 for rings) */
export const CARDS_PER_SUIT: Record<Suit, number> = {
  mountains: 8,
  shadows: 8,
  forests: 8,
  hills: 8,
  rings: 5,
};

export const SUITS: Suit[] = [
  "mountains",
  "shadows",
  "forests",
  "hills",
  "rings",
];

type BaseCard<T> = { suit: T; value: number };

export type Card = BaseCard<Suit>;
export type ThreatCard = BaseCard<"threat">;
export type AnyCard = Card | ThreatCard;

export interface Trick {
  number: number;
  cards: Card[];
}

export { Controller, AIController };

export interface ChoiceButton<T> {
  label: string;
  value: T;
  onClick?: () => void;
  disabled?: boolean;
  grid?: boolean;
}

export interface ChoiceButtonOptions<T> {
  title: string;
  message: string;
  buttons: ChoiceButton<T>[];
  info?: string;
}

export interface ChoiceCardOptions<T extends AnyCard = AnyCard> {
  title: string;
  message: string;
  cards: T[];
  info?: string;
}

export interface CharacterStatus {
  met: boolean;
  completable: boolean;
  completed: boolean;
  details?: string;
}

// ObjectiveStatus represents a character's objective state as a two-axis tuple:
//   Finality: "tentative" (can still change) vs "final" (locked in)
//   Outcome: "failure" (not met) vs "success" (met)
//
// Combinations:
//   [tentative, failure] → not met yet, still achievable
//   [tentative, success] → currently met, could change
//   [final, failure]     → impossible to achieve
//   [final, success]     → guaranteed/locked in
export type Finality = "tentative" | "final";
export type Outcome = "failure" | "success";
export type ObjectiveStatus = [Finality, Outcome];

// Represents a trick won (UI decides how to render - e.g., as card back)
export type ObjectiveTrick = "trick";

// Objective cards can be real cards, threat cards, or tricks
export type ObjectiveCard = Card | ThreatCard | ObjectiveTrick;

// The full objective display for a seat
export interface ObjectiveCards {
  cards: ObjectiveCard[];
}
