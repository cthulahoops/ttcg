import type { Card } from "../types";
import type { CharacterDefinition } from "./types";

export const Gwaihir: CharacterDefinition = {
  name: "Gwaihir",
  setupText: "Exchange with Gandalf twice",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
  },

  objective: {
    text: "Win at least two tricks containing a mountain card",
    check: (_game, seat) => {
      const tricksWithMountains = seat.tricksWon.filter(
        (trick: { number: number; cards: Card[] }) =>
          trick.cards.some((c: Card) => c.suit === "mountains"),
      );
      return tricksWithMountains.length >= 2;
    },
    isCompletable: (_game, _seat) => {
      // Hard to determine without knowing remaining mountains distribution
      // Simplified: always completable
      return true;
    },
    isCompleted: (game, seat) => Gwaihir.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const tricksWithMountains = seat.tricksWon.filter(
        (trick: { number: number; cards: Card[] }) =>
          trick.cards.some((c: Card) => c.suit === "mountains"),
      );
      const met = Gwaihir.objective.check(game, seat);
      const completable = Gwaihir.objective.isCompletable(game, seat);

      return {
        met,
        completable,
        details: `Tricks with mountains: ${tricksWithMountains.length}/2`,
      };
    },
  },
};
