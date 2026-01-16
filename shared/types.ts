// ===== SHARED TYPE DEFINITIONS =====

import type { Controller, AIController } from "./controllers";

export type Suit = "mountains" | "shadows" | "forests" | "hills" | "rings";

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
