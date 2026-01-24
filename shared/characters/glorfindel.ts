import { CARDS_PER_SUIT, type Card, type ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Glorfindel: CharacterDefinition = {
  name: "Glorfindel",
  setupText: "Take the lost card",

  setup: async (game, seat, _setupContext) => {
    await game.takeLostCard(seat);
  },

  objective: {
    text: "Win every Shadows card",

    getStatus: (game, seat): ObjectiveStatus => {
      const shadowsCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "shadows");
      const met = shadowsCards.length === CARDS_PER_SUIT.shadows;

      // Check completability: if any shadows card was won by someone else
      let completable = true;
      for (let value = 1; value <= CARDS_PER_SUIT.shadows; value++) {
        if (game.cardGone(seat, "shadows", value)) {
          completable = false;
          break;
        }
      }

      if (met) {
        return { finality: "final", outcome: "success" };
      } else if (!completable) {
        return { finality: "final", outcome: "failure" };
      } else {
        return { finality: "tentative", outcome: "failure" };
      }
    },

    getDetails: (_game, seat): string => {
      const shadowsCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "shadows");
      return `Shadows: ${shadowsCards.length}/${CARDS_PER_SUIT.shadows}`;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "shadows")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
