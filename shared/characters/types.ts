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

// ===== New API types for migrated characters =====
// These will replace the above once all characters are migrated.

export interface NewCharacterObjective {
  text?: string;
  getText?: (game: Game) => string;

  getStatus: (game: Game, seat: Seat) => ObjectiveStatus;
  getDetails?: (game: Game, seat: Seat) => string | undefined;
}

export interface NewCharacterDisplay {
  getObjectiveCards?: (game: Game, seat: Seat) => ObjectiveCards;
  // No renderStatus - migrated characters don't need it
}

export interface NewCharacterDefinition {
  name: string;
  setupText: string;
  setup: (
    game: Game,
    seat: Seat,
    setupContext: GameSetupContext
  ) => Promise<void>;
  objective: NewCharacterObjective;
  display: NewCharacterDisplay;
}

// Union types for adapter/registry that accept both old and new
export type AnyCharacterObjective = CharacterObjective | NewCharacterObjective;
export type AnyCharacterDefinition =
  | CharacterDefinition
  | NewCharacterDefinition;
