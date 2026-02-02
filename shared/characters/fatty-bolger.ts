import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveExactly, tricksWinnable } from "../objectives";

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
      return achieveExactly(tricksWinnable(game, seat), 1);
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
