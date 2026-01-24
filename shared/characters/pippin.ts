import type { Seat } from "../seat";
import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

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
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const myCount = seat.getTrickCount();
      const met = myCount === minCount;

      // Calculate total gap: how many more tricks does Pippin have than players with fewer?
      let totalGap = 0;
      for (const otherTricks of allCounts) {
        if (otherTricks < myCount) {
          totalGap += myCount - otherTricks;
        }
      }
      const tricksRemaining = game.tricksRemaining();
      const completable = totalGap <= tricksRemaining;

      // If game is finished, status is final
      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
      }

      // If not completable, it's final failure
      if (!completable) {
        return { finality: "final", outcome: "failure" };
      }

      // Check for early/guaranteed completion
      const myMax = myCount + tricksRemaining;
      const otherCounts = game.seats
        .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
        .map((s: Seat) => s.getTrickCount());
      const othersMin = Math.min(...otherCounts);
      // Guaranteed fewest if even winning all remaining tricks keeps us at or below current minimum
      if (myMax <= othersMin) {
        return { finality: "final", outcome: "success" };
      }

      // Game ongoing, still completable, not guaranteed
      return {
        finality: "tentative",
        outcome: met ? "success" : "failure",
      };
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
