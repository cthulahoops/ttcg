import type { Card } from "../types";
import type { CharacterDefinition } from "./types";

export const Glorfindel: CharacterDefinition = {
  name: "Glorfindel",
  setupText: "Take the lost card",

  setup: async (game, seat, _setupContext) => {
    await game.takeLostCard(seat);
  },

  objective: {
    text: "Win every Shadows card",
    check: (_game, seat) => {
      const shadowsCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "shadows");
      return shadowsCards.length === 8; // All shadows cards (1-8)
    },
    isCompletable: (game, seat) => {
      for (let value = 1; value <= 8; value++) {
        if (game.cardGone(seat, "shadows", value)) {
          return false;
        }
      }
      return true;
    },
    isCompleted: (game, seat) => Glorfindel.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const shadowsCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "shadows");
      const met = Glorfindel.objective.check(game, seat);
      const completable = Glorfindel.objective.isCompletable(game, seat);
      const completed = Glorfindel.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Shadows: ${shadowsCards.length}/8`,
      };
    },
  },
};
