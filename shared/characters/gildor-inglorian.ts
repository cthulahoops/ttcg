import type { Card } from "../types";
import type { CharacterDefinition } from "./types";

export const GildorInglorian: CharacterDefinition = {
  name: "Gildor Inglorian",
  setupText: "Exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Play a forests card in final trick",
    check: (game, seat) => {
      if (!game.finished) {
        return false; // Final trick hasn't been played yet
      }

      // Find the last card played by this seat
      const lastCardPlayed = seat.playedCards[seat.playedCards.length - 1];
      if (!lastCardPlayed) return false;

      return lastCardPlayed.suit === "forests";
    },
    isCompletable: (game, seat) => {
      if (game.finished) {
        return GildorInglorian.objective.check(game, seat);
      }

      // Still completable if player has forests cards in hand
      const availableCards = seat.hand?.getAvailableCards() ?? [];
      return availableCards.some((c: Card) => c.suit === "forests");
    },
    isCompleted: (game, seat) => game.finished && GildorInglorian.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = GildorInglorian.objective.check(game, seat);
      const completable = GildorInglorian.objective.isCompletable(game, seat);
      const completed = GildorInglorian.objective.isCompleted(game, seat);

      return { met, completable, completed };
    },
  },
};
