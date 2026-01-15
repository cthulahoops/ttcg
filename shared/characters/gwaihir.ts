import type { Card } from "../types";
import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

const countMountainTricks = (seat: Seat) =>
  seat.tricksWon.filter((trick) =>
    trick.cards.some((c: Card) => c.suit === "mountains"),
  ).length;

export const Gwaihir: CharacterDefinition = {
  name: "Gwaihir",
  setupText: "Exchange with Gandalf twice",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
  },

  objective: {
    text: "Win at least two tricks containing a mountain card",
    check: (_game, seat) => countMountainTricks(seat) >= 2,
    isCompletable: (_game, _seat) => {
      // Hard to determine without knowing remaining mountains distribution
      // Simplified: always completable
      return true;
    },
    isCompleted: (game, seat) => Gwaihir.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Gwaihir.objective.check(game, seat);
      const completable = Gwaihir.objective.isCompletable(game, seat);
      const completed = Gwaihir.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Tricks with mountains: ${countMountainTricks(seat)}/2`,
      };
    },
  },
};
