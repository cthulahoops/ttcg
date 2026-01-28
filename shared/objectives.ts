import type { Card, ObjectiveStatus } from "shared/types";
import { CARDS_PER_SUIT, SUITS } from "shared/types";
import type { Seat } from "shared/seat";
import type { Game } from "shared/game";

/**
 * Combines two objective statuses where both must be achieved.
 * - Outcome: success only if both are success
 * - Finality: final if either is {final, failure} OR both are final
 */
export function achieveBoth(
  s1: ObjectiveStatus,
  s2: ObjectiveStatus
): ObjectiveStatus {
  const isFinalFailure = (s: ObjectiveStatus) =>
    s.finality === "final" && s.outcome === "failure";

  const outcome: ObjectiveStatus["outcome"] =
    s1.outcome === "success" && s2.outcome === "success"
      ? "success"
      : "failure";

  const finality: ObjectiveStatus["finality"] =
    isFinalFailure(s1) ||
    isFinalFailure(s2) ||
    (s1.finality === "final" && s2.finality === "final")
      ? "final"
      : "tentative";

  return { finality, outcome };
}

export function tricksWinnable(
  game: Game,
  seat: Seat,
  cardPredicate?: (card: Card) => boolean
): ObjectivePossibilities {
  if (!cardPredicate) {
    const current = seat.getTrickCount();
    return {
      current,
      max: current + game.tricksRemaining(),
    };
  }

  // Count tricks where at least one card matches the predicate
  const current = seat.tricksWon.filter((trick) =>
    trick.cards.some(cardPredicate)
  ).length;

  // Count matching cards still in play (not won by anyone)
  let matchingCardsInPlay = 0;
  for (const suit of SUITS) {
    for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
      const card: Card = { suit, value };
      if (cardPredicate(card)) {
        if (
          !game.hasCard(seat, suit, value) &&
          !game.cardGone(seat, suit, value)
        ) {
          matchingCardsInPlay++;
        }
      }
    }
  }

  return {
    current,
    max: current + Math.min(matchingCardsInPlay, game.tricksRemaining()),
  };
}

export function cardsWinnable(
  game: Game,
  seat: Seat,
  isTarget: (card: Card) => boolean
): ObjectivePossibilities {
  let current = 0;
  let remaining = 0;

  for (const suit of SUITS) {
    for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
      const card: Card = { suit, value };
      if (isTarget(card)) {
        if (game.hasCard(seat, suit, value)) {
          current++;
        } else if (!game.cardGone(seat, suit, value)) {
          remaining++;
        }
      }
    }
  }

  return {
    current,
    max: current + Math.min(game.tricksRemaining(), remaining),
  };
}

export function winCard(
  game: Game,
  seat: Seat,
  neededCard: Card
): ObjectivePossibilities {
  return cardsWinnable(
    game,
    seat,
    (card) => card.suit === neededCard.suit && card.value === neededCard.value
  );
}

export function achieveCard(
  game: Game,
  seat: Seat,
  card: Card
): ObjectiveStatus {
  return achieveAtLeast(winCard(game, seat, card), 1);
}

export type ObjectivePossibilities = {
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

/**
 * Combines multiple objective statuses where all must be achieved.
 * - Outcome: success only if all are success
 * - Finality: final if any is {final, failure} OR all are final
 */
export function achieveEvery(statuses: ObjectiveStatus[]): ObjectiveStatus {
  if (statuses.length === 0) {
    return { finality: "final", outcome: "success" };
  }
  return statuses.reduce(achieveBoth);
}

/**
 * Returns success if the first possibilities are strictly greater than the second.
 * Used for "win the most" type objectives.
 */
export function achieveMoreThan(
  me: ObjectivePossibilities,
  them: ObjectivePossibilities
): ObjectiveStatus {
  // Final success: I'm ahead and they can never catch up
  if (me.current > them.max) {
    return { finality: "final", outcome: "success" };
  }

  // Final failure: Even at my best I can't beat their current
  if (me.max <= them.current) {
    return { finality: "final", outcome: "failure" };
  }

  // Tentative: outcome based on current standings
  return {
    finality: "tentative",
    outcome: me.current > them.current ? "success" : "failure",
  };
}
