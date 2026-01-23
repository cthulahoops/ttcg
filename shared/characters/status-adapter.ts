import type { Game } from "../game";
import type { Seat } from "../seat";
import type { ObjectiveStatus } from "../types";
import type { CharacterObjective, CharacterDefinition } from "./types";

/**
 * Get ObjectiveStatus for a character.
 */
export function getObjectiveStatus(
  objective: CharacterObjective,
  game: Game,
  seat: Seat
): ObjectiveStatus {
  return objective.getStatus(game, seat);
}

/**
 * Get details string for a character.
 */
export function getObjectiveDetails(
  character: CharacterDefinition,
  game: Game,
  seat: Seat
): string | undefined {
  if (character.objective.getDetails) {
    return character.objective.getDetails(game, seat);
  }
  return undefined;
}
