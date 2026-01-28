import type { Card, ObjectiveStatus, Suit } from "shared/types";
import { CARDS_PER_SUIT, SUITS } from "shared/types";
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

export function cardsWinnable(
  game: Game,
  seat: Seat,
  isTarget: (card: Card) => boolean
): ObjectivePossibilities {
  let current = 0;
  let max = 0;

  for (const suit of SUITS) {
    for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
      const card: Card = { suit, value };
      if (isTarget(card)) {
        if (game.hasCard(seat, suit, value)) {
          current++;
          max++;
        } else if (!game.cardGone(seat, suit, value)) {
          max++;
        }
      }
    }
  }

  return { current, max };
}

export function winCard(
  game: Game,
  seat: Seat,
  suit: Suit,
  value: number
): ObjectivePossibilities {
  return cardsWinnable(
    game,
    seat,
    (card) => card.suit === suit && card.value === value
  );
}

export function achieveCard(
  game: Game,
  seat: Seat,
  suit: Suit,
  value: number
): ObjectiveStatus {
  return achieveAtLeast(winCard(game, seat, suit, value), 1);
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
    finality: possibilities.max >= target ? "tentative" : "final",
    outcome: "failure",
  };
}

export function achieveExactly(
  possibilities: ObjectivePossibilities,
  target: number
) {
  return achieveRange(possibilities, { min: target, max: target });
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

export function doNot(objective: ObjectiveStatus): ObjectiveStatus {
  return {
    finality: objective.finality,
    outcome: objective.outcome == "failure" ? "success" : "failure",
  };
}
