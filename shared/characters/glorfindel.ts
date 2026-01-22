import { CARDS_PER_SUIT, type Card } from "../types";
import type { LegacyCharacterDefinition } from "./types";

export const Glorfindel: LegacyCharacterDefinition = {
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
      return shadowsCards.length === CARDS_PER_SUIT.shadows;
    },
    isCompletable: (game, seat) => {
      for (let value = 1; value <= CARDS_PER_SUIT.shadows; value++) {
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
        details: `Shadows: ${shadowsCards.length}/${CARDS_PER_SUIT.shadows}`,
      };
    },
    getObjectiveCards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "shadows")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
