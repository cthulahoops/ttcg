// Character type definitions

import type { Seat } from "../seat";
import type {
  CharacterStatus,
  ObjectiveCards,
  ObjectiveStatus,
} from "../types";
import type { Game, GameSetupContext } from "../game";

// ===== Legacy API types for unmigrated characters =====
// These are the old interfaces with boolean methods.

export interface LegacyCharacterObjective {
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

export interface LegacyCharacterDisplay {
  renderStatus: (game: Game, seat: Seat) => CharacterStatus;
  getObjectiveCards?: (game: Game, seat: Seat) => ObjectiveCards;
}

export interface LegacyCharacterDefinition {
  name: string;
  setupText: string;
  setup: (
    game: Game,
    seat: Seat,
    setupContext: GameSetupContext
  ) => Promise<void>;
  objective: LegacyCharacterObjective;
  display: LegacyCharacterDisplay;
}

// ===== New API types for migrated characters =====
// These are the canonical interfaces going forward.

export interface CharacterObjective {
  text?: string;
  getText?: (game: Game) => string;

  getStatus: (game: Game, seat: Seat) => ObjectiveStatus;
  getDetails?: (game: Game, seat: Seat) => string | undefined;
}

export interface CharacterDisplay {
  getObjectiveCards?: (game: Game, seat: Seat) => ObjectiveCards;
  // No renderStatus - migrated characters don't need it
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

// Union types for adapter/registry that accept both old and new
export type AnyCharacterObjective =
  | LegacyCharacterObjective
  | CharacterObjective;
export type AnyCharacterDefinition =
  | LegacyCharacterDefinition
  | CharacterDefinition;
