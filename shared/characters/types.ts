// Character type definitions

import type { Seat } from "../seat";
import type { ObjectiveCards, ObjectiveStatus } from "../types";
import type { Game, GameSetupContext } from "../game";

// ===== Canonical API types for characters =====

export interface CharacterObjective {
  text?: string;
  getText?: (game: Game) => string;

  getStatus: (game: Game, seat: Seat) => ObjectiveStatus;
  getDetails?: (game: Game, seat: Seat) => string | undefined;
}

export interface CharacterDisplay {
  getObjectiveCards?: (game: Game, seat: Seat) => ObjectiveCards;
}

export interface CharacterDefinition {
  name: string;
  setupText: string;
  setup: (
    game: Game,
    seat: Seat,
    setupContext: GameSetupContext
  ) => Promise<void>;
  objective: CharacterObjective;
  display: CharacterDisplay;
}
