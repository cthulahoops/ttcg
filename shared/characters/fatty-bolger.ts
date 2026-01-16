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
    check: (_game, seat) => seat.getTrickCount() === 1,
    isCompletable: (_game, seat) => seat.getTrickCount() <= 1,
    isCompleted: (game, seat) => game.finished && FattyBolger.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = FattyBolger.objective.check(game, seat);
      const completable = FattyBolger.objective.isCompletable(game, seat);
      const completed = FattyBolger.objective.isCompleted(game, seat);
      return game.displaySimple(met, completable, completed);
    },
  },
};
