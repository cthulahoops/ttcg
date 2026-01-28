import type { ObjectiveStatus } from "shared/types";
import type { Seat } from "shared/seat";
import type { Game } from "shared/game";

import { bothAchieved as achieveBoth } from "shared/utils";

export function tricksWinnable(game: Game, seat: Seat) {
  const current = seat.getTrickCount();
  return {
    current: current,
    max: current + game.tricksRemaining(),
  };
}

type ObjectivePossibilities = {
  current: number;
  max: number;
};

export function achieveAtLeast(
  possibilities: ObjectivePossibilities,
  target: number
): ObjectiveStatus {
  if (possibilities.current >= target) {
    return {
      finality: "final",
      outcome: "success",
    };
  }
  return {
    finality: possibilities.max > target ? "tentative" : "final",
    outcome: "failure",
  };
}

export function achieveRange(
  possibilities: ObjectivePossibilities,
  range: { min: number; max: number }
) {
  return achieveBoth(
    achieveAtLeast(possibilities, range.min),
    doNot(achieveAtLeast(possibilities, range.max + 1))
  );
}

function doNot(objective: ObjectiveStatus): ObjectiveStatus {
  return {
    finality: objective.finality,
    outcome: objective.outcome == "failure" ? "success" : "failure",
  };
}
