import type { Game } from "../game";
import type { Seat } from "../seat";
import type { ObjectiveStatus, Finality, Outcome } from "../types";
import type { CharacterObjective, CharacterDefinition } from "./types";

/**
 * Convert legacy boolean trio to ObjectiveStatus tuple.
 *
 * Two axes:
 *   Finality: "tentative" (can still change) vs "final" (locked in)
 *   Outcome: "failure" (not met) vs "success" (met)
 *
 * Mapping:
 *   [tentative, failure] → working toward it
 *   [tentative, success] → currently meeting it
 *   [final, failure]     → impossible
 *   [final, success]     → guaranteed
 */
export function booleansToStatus(
  met: boolean,
  completable: boolean,
  completed: boolean
): ObjectiveStatus {
  const finality: Finality = completed || !completable ? "final" : "tentative";
  const outcome: Outcome = met ? "success" : "failure";
  return [finality, outcome];
}

/**
 * Get ObjectiveStatus for a character.
 *
 * Strategy:
 * 1. If objective has getStatus(), use it directly (new API)
 * 2. Otherwise, call legacy boolean methods and convert (fallback)
 *
 * This allows incremental migration - characters can be updated
 * one at a time while the system keeps working.
 */
export function getObjectiveStatus(
  objective: CharacterObjective,
  game: Game,
  seat: Seat
): ObjectiveStatus {
  // Prefer new API if available
  if (objective.getStatus) {
    return objective.getStatus(game, seat);
  }

  // Fallback: call legacy methods and convert
  const met = objective.check(game, seat);
  const completable = objective.isCompletable(game, seat);
  const completed = objective.isCompleted(game, seat);

  return booleansToStatus(met, completable, completed);
}

/**
 * Get details string for a character.
 *
 * Strategy:
 * 1. If objective has getDetails(), use it (new API)
 * 2. Otherwise, call display.renderStatus() and extract details (fallback)
 *
 * The fallback calls renderStatus() which may duplicate work with
 * getObjectiveStatus(), but this is acceptable during migration.
 * Once all characters are migrated, the fallback path is removed.
 */
export function getObjectiveDetails(
  character: CharacterDefinition,
  game: Game,
  seat: Seat
): string | undefined {
  // Prefer new API if available
  if (character.objective.getDetails) {
    return character.objective.getDetails(game, seat);
  }

  // Fallback: extract from legacy renderStatus
  const legacyStatus = character.display.renderStatus(game, seat);
  return legacyStatus.details;
}
