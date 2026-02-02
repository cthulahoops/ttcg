import type { Card, ObjectiveStatus } from "shared/types";
import { CARDS_PER_SUIT, SUITS } from "shared/types";
import type { Seat } from "shared/seat";
import type { Game } from "shared/game";

/**
 * Calculate the maximum number of additional tricks a seat can win from this point.
 * This is limited by both the tricks remaining in the game AND the cards the player has.
 */
function maxTricksWinnableFromHere(game: Game, seat: Seat): number {
  const cardsInHand =
    seat.hand.getAvailableCards().length + (seat.asideCard ? 1 : 0);
  return Math.min(game.tricksRemaining(), cardsInHand);
}

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
  trickPredicate?: (trick: { number: number }) => boolean
): ObjectivePossibilities {
  if (!trickPredicate) {
    const current = seat.getTrickCount();
    return {
      current,
      max: current + maxTricksWinnableFromHere(game, seat),
    };
  }

  // Count tricks matching the predicate that we've won
  const current = seat.tricksWon.filter(trickPredicate).length;

  if (game.finished) {
    return { current, max: current };
  }

  // Count matching tricks still to be played
  const totalMatching = Array.from(
    { length: game.tricksToPlay },
    (_, i) => i
  ).filter((n) => trickPredicate({ number: n })).length;

  const alreadyPlayed = game.tricksToPlay - game.tricksRemaining();
  const matchingPlayed = Array.from(
    { length: alreadyPlayed },
    (_, i) => i
  ).filter((n) => trickPredicate({ number: n })).length;

  const matchingRemaining = totalMatching - matchingPlayed;

  return {
    current,
    max:
      current +
      Math.min(matchingRemaining, maxTricksWinnableFromHere(game, seat)),
  };
}

export function tricksWithCardsWinnable(
  game: Game,
  seat: Seat,
  cardPredicate: (card: Card) => boolean
): ObjectivePossibilities {
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
    max:
      current +
      Math.min(matchingCardsInPlay, maxTricksWinnableFromHere(game, seat)),
  };
}

export function leadsWinnable(
  game: Game,
  seat: Seat,
  cardPredicate: (card: Card) => boolean
): ObjectivePossibilities {
  // Count tricks where this seat led with a matching card
  let current = 0;

  for (const trick of game.completedTricks) {
    const lead = trick.plays[0];
    if (lead?.playerIndex === seat.seatIndex && cardPredicate(lead.card)) {
      current++;
    }
  }

  // Check current trick too
  if (game.currentTrick.length > 0) {
    const lead = game.currentTrick[0];
    if (lead?.playerIndex === seat.seatIndex && cardPredicate(lead.card)) {
      current++;
    }
  }

  if (game.finished) {
    return { current, max: current };
  }

  // max: need both tricks remaining AND matching cards still available
  let matchingCardsInPlay = 0;
  for (const suit of SUITS) {
    for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
      const card = { suit, value };
      if (cardPredicate(card) && game.cardAvailable(suit, value)) {
        matchingCardsInPlay++;
      }
    }
  }

  return {
    current,
    max:
      current +
      Math.min(maxTricksWinnableFromHere(game, seat), matchingCardsInPlay),
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

  // Each trick contains numCharacters cards, so multiple target cards can be won per trick
  const maxCardsPlayable =
    maxTricksWinnableFromHere(game, seat) * game.numCharacters;
  return {
    current,
    max: current + Math.min(maxCardsPlayable, remaining),
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
  me: ObjectivePossibilities,
  them: ObjectivePossibilities | number
): ObjectiveStatus {
  if (typeof them === "number") {
    const target = them;
    if (me.current >= target) {
      return { finality: "final", outcome: "success" };
    }
    return {
      finality: me.max >= target ? "tentative" : "final",
      outcome: "failure",
    };
  }

  // Comparing two possibilities: success if me >= them
  // Final success: I'm at least tied and they can't get ahead
  if (me.current >= them.max) {
    return { finality: "final", outcome: "success" };
  }

  // Final failure: Even at my best I can't match their current
  if (me.max < them.current) {
    return { finality: "final", outcome: "failure" };
  }

  // Tentative: outcome based on current standings
  return {
    finality: "tentative",
    outcome: me.current >= them.current ? "success" : "failure",
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
 * Combines multiple objective statuses where any can be achieved.
 * - Outcome: success if any is success
 * - Finality: final if any is {final, success} OR all are final
 */
export function achieveSome(statuses: ObjectiveStatus[]): ObjectiveStatus {
  if (statuses.length === 0) {
    return { finality: "final", outcome: "failure" };
  }

  const isFinalSuccess = (s: ObjectiveStatus) =>
    s.finality === "final" && s.outcome === "success";

  const outcome: ObjectiveStatus["outcome"] = statuses.some(
    (s) => s.outcome === "success"
  )
    ? "success"
    : "failure";

  const finality: ObjectiveStatus["finality"] =
    statuses.some(isFinalSuccess) ||
    statuses.every((s) => s.finality === "final")
      ? "final"
      : "tentative";

  return { finality, outcome };
}

/**
 * Returns success if the first possibilities are strictly greater than the second.
 * Used for "win the most" type objectives.
 */
export function achieveMoreThan(
  me: ObjectivePossibilities,
  them: ObjectivePossibilities | number
): ObjectiveStatus {
  if (typeof them === "number") {
    return achieveAtLeast(me, them + 1);
  }
  // me > them ≡ ¬(them >= me)
  return doNot(achieveAtLeast(them, me));
}
