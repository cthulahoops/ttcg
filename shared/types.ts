// ===== SHARED TYPE DEFINITIONS =====

import type { Controller, AIController } from "./controllers";
import type { Seat } from "./seat";
import type { Game } from "./game";

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

export interface SetupContext {
  frodoSeat: Seat | null;
  exchangeMade?: boolean;
}

export interface CharacterStatus {
  met: boolean;
  completable: boolean;
  completed: boolean;
  details?: string;
}

export interface CharacterDefinition {
  name: string;
  setupText: string;
  threatSuit?: Suit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup: (game: any, seat: Seat, setupContext: SetupContext) => Promise<void>;
  objective: {
    text?: string;
    getText?: (game: any) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    check: (game: any, seat: Seat) => boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isCompletable: (game: any, seat: Seat) => boolean;
  };
  display: {
    renderStatus: (game: Game, seat: Seat) => CharacterStatus;
  };
}
