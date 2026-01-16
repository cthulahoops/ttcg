// Character type definitions

import type { Seat } from "../seat";
import type { CharacterStatus } from "../types";
import type { Game, GameSetupContext } from "../game";

export interface CharacterObjective {
  text?: string;
  getText?: (game: Game) => string;
  check: (game: Game, seat: Seat) => boolean;
  isCompletable: (game: Game, seat: Seat) => boolean;
  isCompleted: (game: Game, seat: Seat) => boolean;
}

export interface CharacterDisplay {
  renderStatus: (game: Game, seat: Seat) => CharacterStatus;
}

export interface CharacterDefinition {
  name: string;
  setupText: string;
  setup: (game: Game, seat: Seat, setupContext: GameSetupContext) => Promise<void>;
  objective: CharacterObjective;
  display: CharacterDisplay;
}
