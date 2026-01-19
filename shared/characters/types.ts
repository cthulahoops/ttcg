// Character type definitions

import type { Seat } from "../seat";
import type {
  CharacterStatus,
  ObjectiveCards,
  ObjectiveStatus,
} from "../types";
import type { Game, GameSetupContext } from "../game";

export interface CharacterObjective {
  text?: string;
  getText?: (game: Game) => string;

  // Legacy methods (keep during migration)
  check: (game: Game, seat: Seat) => boolean;
  isCompletable: (game: Game, seat: Seat) => boolean;
  isCompleted: (game: Game, seat: Seat) => boolean;

  // New methods (optional during migration, required after)
  getStatus?: (game: Game, seat: Seat) => ObjectiveStatus;
  getDetails?: (game: Game, seat: Seat) => string | undefined;
}

export interface CharacterDisplay {
  renderStatus: (game: Game, seat: Seat) => CharacterStatus;
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
