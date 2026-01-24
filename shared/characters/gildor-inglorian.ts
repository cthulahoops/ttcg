import type { Card, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const GildorInglorian: CharacterDefinition = {
  name: "Gildor Inglorian",
  setupText: "Exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Play a forests card in final trick",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!game.finished) {
        // Still completable if player has forests cards in hand
        const availableCards = seat.hand.getAvailableCards() ?? [];
        const hasForestsInHand = availableCards.some(
          (c: Card) => c.suit === "forests"
        );

        if (!hasForestsInHand) {
          return { finality: "final", outcome: "failure" };
        }

        return { finality: "tentative", outcome: "failure" };
      }

      // Game finished - check if last card played was forests
      const lastCardPlayed = seat.playedCards[seat.playedCards.length - 1];
      const met = lastCardPlayed?.suit === "forests";

      return {
        finality: "final",
        outcome: met ? "success" : "failure",
      };
    },
  },

  display: {},
};
