import type { Seat } from "../seat";
import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import {
  tricksWinnable,
  achieveAtLeast,
  achieveEvery,
} from "shared/objectives";

/**
 * Checks if it's still possible for all other players to catch up to Pippin,
 * accounting for the shared trick constraint.
 */
function canAllCatchUp(
  myCount: number,
  otherCounts: number[],
  tricksRemaining: number
): boolean {
  // Total tricks needed for all players below to reach myCount
  const tricksNeeded = otherCounts
    .map((count) => Math.max(0, myCount - count))
    .reduce((a, b) => a + b, 0);

  return tricksNeeded <= tricksRemaining;
}

export const Pippin: CharacterDefinition = {
  name: "Pippin",
  setupText: "Exchange with Frodo, Merry, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Merry", "Sam"].includes(c)
    );
  },

  objective: {
    text: "Win the fewest (or joint fewest) tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const myTricks = tricksWinnable(game, seat);

      // Pippin needs each other player to have at least as many tricks as him
      const othersTricks = game.seats
        .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
        .map((s: Seat) => tricksWinnable(game, s));

      const baseStatus = achieveEvery(
        othersTricks.map((other) => achieveAtLeast(other, myTricks))
      );

      // Check shared trick constraint: can all others catch up to Pippin's minimum?
      const myCount = seat.getTrickCount();
      const otherCounts = game.seats
        .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
        .map((s: Seat) => s.getTrickCount());

      if (!canAllCatchUp(myCount, otherCounts, game.tricksRemaining())) {
        return { finality: "final", outcome: "failure" };
      }

      return baseStatus;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
