import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const FattyBolger: CharacterDefinition = {
  name: "Fatty Bolger",
  setupText: "Give a card to every other character (don't take any back)",

  setup: async (game, seat, _setupContext) => {
    if (game.playerCount === 1) {
      game.revealHand(seat);
    }

    for (const otherSeat of game.seats) {
      if (otherSeat.seatIndex !== seat.seatIndex) {
        const availableCards = seat.hand.getAvailableCards();
        if (availableCards.length === 0) {
          break;
        }

        await game.giveCard(seat, otherSeat);
      }
    }

    game.tricksToPlay += 1;
  },

  objective: {
    text: "Win exactly one trick",

    getStatus: (game, seat): ObjectiveStatus => {
      const trickCount = seat.getTrickCount();
      const met = trickCount === 1;

      // Cannot complete if already have more than 1 trick
      if (trickCount > 1) {
        return { finality: "final", outcome: "failure" };
      }

      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
      }

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
