import type { Game } from "../game";
import type { Seat } from "../seat";
import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import {
  tricksWinnable,
  achieveMoreThan,
  achieveSome,
  achieveBoth,
  type ObjectivePossibilities,
} from "../objectives";

/**
 * Checks if a middle position (neither fewest nor most) is achievable.
 *
 * A middle position requires:
 * - At least one player strictly below Galadriel (not fewest)
 * - At least one player strictly above Galadriel (not most)
 *
 * This accounts for the constraint that remaining tricks are shared among all players.
 */
function middlePositionCompletable(game: Game, seat: Seat): boolean {
  const myCount = seat.getTrickCount();
  const otherCounts = game.seats
    .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
    .map((s: Seat) => s.getTrickCount());
  const otherMin = Math.min(...otherCounts);
  const otherMax = Math.max(...otherCounts);
  const tricksRemaining = game.tricksRemaining();

  // Galadriel needs to end with more than the current min among others (to not be fewest)
  const targetGaladriel = otherMin + 1;
  const tricksNeededForGaladriel = Math.max(0, targetGaladriel - myCount);

  // Galadriel's actual final count will be at least max(myCount, targetGaladriel)
  // Someone needs to beat this (to ensure she's not the most)
  const actualGaladriel = Math.max(myCount, targetGaladriel);
  const targetAbove = actualGaladriel + 1;
  const tricksNeededForAbove = Math.max(0, targetAbove - otherMax);

  return tricksNeededForGaladriel + tricksNeededForAbove <= tricksRemaining;
}

/**
 * Checks if Galadriel is guaranteed to be in the middle position.
 * This happens when:
 * - There's at least one player strictly below who can't catch up
 * - There's at least one player strictly above who Galadriel can't catch
 */
function isGuaranteedMiddle(game: Game, seat: Seat): boolean {
  const myCount = seat.getTrickCount();
  const tricksRemaining = game.tricksRemaining();
  const otherCounts = game.seats
    .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
    .map((s: Seat) => s.getTrickCount());

  const playersBelow = otherCounts.filter((c) => c < myCount);
  const playersAbove = otherCounts.filter((c) => c > myCount);

  if (playersBelow.length === 0 || playersAbove.length === 0) {
    return false;
  }

  // Guaranteed not fewest: the highest player below can't catch up
  const maxBelow = Math.max(...playersBelow);
  const guaranteedNotFewest = maxBelow + tricksRemaining < myCount;

  // Guaranteed not most: even winning all remaining, can't exceed the lowest above
  const minAbove = Math.min(...playersAbove);
  const guaranteedNotMost = myCount + tricksRemaining < minAbove;

  return guaranteedNotFewest && guaranteedNotMost;
}

export const Galadriel: CharacterDefinition = {
  name: "Galadriel",
  setupText: "Exchange with either the lost card or Gandalf",

  setup: async (game, seat, setupContext) => {
    const gandalfInPlay = game.seats.some(
      (s) => s.character?.name === "Gandalf"
    );
    const lostCardExists = game.lostCard !== null;

    // If Gandalf is in play, exchange is required (choose Gandalf or lost card if available)
    if (gandalfInPlay) {
      const options = ["Gandalf"];
      if (lostCardExists) {
        options.push("Lost Card");
      }

      const choice = await game.choice(seat, "Exchange with?", options);

      if (choice === "Lost Card") {
        await game.exchangeWithLostCard(seat, setupContext);
      } else {
        await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
      }
      return;
    }

    // Gandalf not in play - lost card exchange is optional
    if (lostCardExists) {
      const choice = await game.choice(seat, "Exchange with?", [
        "Lost Card",
        "Skip",
      ]);

      if (choice === "Lost Card") {
        await game.exchangeWithLostCard(seat, setupContext);
      }
    }
  },

  objective: {
    text: "Win neither the fewest nor the most tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const myTricks = tricksWinnable(game, seat);
      const othersTricks = game.seats
        .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
        .map((s: Seat) => tricksWinnable(game, s));

      // Not fewest: at least one other player has strictly fewer tricks
      const notFewest = achieveSome(
        othersTricks.map((other: ObjectivePossibilities) =>
          achieveMoreThan(myTricks, other)
        )
      );

      // Not most: at least one other player has strictly more tricks
      const notMost = achieveSome(
        othersTricks.map((other: ObjectivePossibilities) =>
          achieveMoreThan(other, myTricks)
        )
      );

      // Combine the two constraints
      const baseStatus = achieveBoth(notFewest, notMost);

      // Apply additional feasibility check for shared trick constraint
      if (!middlePositionCompletable(game, seat)) {
        return { finality: "final", outcome: "failure" };
      }

      // Check for guaranteed success (early completion)
      if (
        baseStatus.outcome === "success" &&
        baseStatus.finality === "tentative" &&
        isGuaranteedMiddle(game, seat)
      ) {
        return { finality: "final", outcome: "success" };
      }

      // If base status is final success but we're not guaranteed middle,
      // downgrade to tentative (the utility-based check is optimistic)
      if (
        baseStatus.finality === "final" &&
        baseStatus.outcome === "success" &&
        !game.finished &&
        !isGuaranteedMiddle(game, seat)
      ) {
        return { finality: "tentative", outcome: "success" };
      }

      return baseStatus;
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
