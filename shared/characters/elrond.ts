import type { Card, ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

export const Elrond: CharacterDefinition = {
  name: "Elrond",
  setupText: "Everyone simultaneously passes 1 card to the right",

  setup: async (game, _seat, _setupContext) => {
    const cardsToPass: Card[] = [];
    for (const seat of game.seats) {
      const availableCards = seat.hand.getAvailableCards();

      const card = await seat.controller.chooseCard({
        title: `${seat.getDisplayName()} - Pass to Right`,
        message: "Choose a card to pass to the player on your right",
        cards: availableCards,
      });
      cardsToPass.push(card);
    }

    for (let i = 0; i < game.seats.length; i++) {
      game.seats[i]!.hand.removeCard(cardsToPass[i]!);
    }
    for (let i = 0; i < game.seats.length; i++) {
      const toSeat = game.seats[(i + 1) % game.seats.length]!;
      toSeat.hand.addCard(cardsToPass[i]!);
    }

    game.log("Everyone passes a card to the right");
    game.refreshDisplay();
  },

  objective: {
    text: "Every character must win a ring card",

    getStatus: (game, _seat): ObjectiveStatus => {
      const seatsNeedingRing = game.seats.filter((s: Seat) => {
        const ringCards = s
          .getAllWonCards()
          .filter((c: Card) => c.suit === "rings");
        return ringCards.length === 0;
      }).length;

      const met = seatsNeedingRing === 0;

      const totalRingCardsWon = game.seats.reduce(
        (total: number, s: Seat) =>
          total +
          s.getAllWonCards().filter((c: Card) => c.suit === "rings").length,
        0
      );
      const ringsRemaining = 5 - totalRingCardsWon;
      const completable = ringsRemaining >= seatsNeedingRing;

      if (met) {
        return { finality: "final", outcome: "success" };
      } else if (!completable) {
        return { finality: "final", outcome: "failure" };
      } else {
        return { finality: "tentative", outcome: "failure" };
      }
    },

    getDetails: (game, _seat): string => {
      const seatsWithRings = game.seats.filter((s: Seat) => {
        const ringCards = s
          .getAllWonCards()
          .filter((c: Card) => c.suit === "rings");
        return ringCards.length >= 1;
      }).length;

      return `Seats with rings: ${seatsWithRings}/${game.seats.length}`;
    },
  },

  display: {},
};
