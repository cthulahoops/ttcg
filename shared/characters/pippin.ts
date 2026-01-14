import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

export const Pippin: CharacterDefinition = {
  name: "Pippin",
  setupText: "Exchange with Frodo, Merry, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Merry", "Sam"].includes(c),
    );
  },

  objective: {
    text: "Win the fewest (or joint fewest) tricks",
    check: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      return seat.getTrickCount() === minCount;
    },
    isCompletable: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const myCount = seat.getTrickCount();

      // Calculate total gap: how many more tricks does Pippin have than players with fewer?
      let totalGap = 0;
      for (const otherTricks of allCounts) {
        if (otherTricks < myCount) {
          totalGap += myCount - otherTricks;
        }
      }

      // Can still complete if other players can catch up with remaining tricks
      return totalGap <= game.tricksRemaining();
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Pippin.objective.check(game, seat);
      const completable = Pippin.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};
