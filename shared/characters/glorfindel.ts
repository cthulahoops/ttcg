import { CARDS_PER_SUIT, type Card, type ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveAtLeast, cardsWinnable } from "../objectives";

export const Glorfindel: CharacterDefinition = {
  name: "Glorfindel",
  setupText: "Take the lost card",

  setup: async (game, seat, _setupContext) => {
    await game.takeLostCard(seat);
  },

  objective: {
    text: "Win every Shadows card",

    getStatus: (game, seat): ObjectiveStatus => {
      const shadows = cardsWinnable(game, seat, (c) => c.suit === "shadows");
      return achieveAtLeast(shadows, CARDS_PER_SUIT.shadows);
    },

    cards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "shadows")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
