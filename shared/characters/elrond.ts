import type { Card } from "../types";
import { Seat, requireHand } from "../seat";
import type { CharacterDefinition } from "./types";

export const Elrond: CharacterDefinition = {
  name: "Elrond",
  setupText: "Everyone simultaneously passes 1 card to the right",

  setup: async (game, _seat, _setupContext) => {
    const cardsToPass: Card[] = [];
    for (const seat of game.seats) {
      const availableCards = requireHand(seat).hand.getAvailableCards();

      const card = await seat.controller.chooseCard({
        title: `${seat.getDisplayName()} - Pass to Right`,
        message: "Choose a card to pass to the player on your right",
        cards: availableCards,
      });
      cardsToPass.push(card);
    }

    for (let i = 0; i < game.seats.length; i++) {
      requireHand(game.seats[i]!).hand.removeCard(cardsToPass[i]!);
    }
    for (let i = 0; i < game.seats.length; i++) {
      const toSeat = requireHand(game.seats[(i + 1) % game.seats.length]!);
      toSeat.hand.addCard(cardsToPass[i]!);
    }

    game.log("Everyone passes a card to the right");
    game.refreshDisplay();
  },

  objective: {
    text: "Every character must win a ring card",
    check: (game, _seat) => {
      return game.seats.every((s: Seat) => {
        const ringCards = s.getAllWonCards().filter((c: Card) => c.suit === "rings");
        return ringCards.length >= 1;
      });
    },
    isCompletable: (game, _seat) => {
      const seatsNeedingRing = game.seats.filter((s: Seat) => {
        const ringCards = s.getAllWonCards().filter((c: Card) => c.suit === "rings");
        return ringCards.length === 0;
      }).length;

      const totalRingCardsWon = game.seats.reduce(
        (total: number, s: Seat) =>
          total + s.getAllWonCards().filter((c: Card) => c.suit === "rings").length,
        0
      );
      const ringsRemaining = 5 - totalRingCardsWon;

      return ringsRemaining >= seatsNeedingRing;
    },
    isCompleted: (game, seat) => Elrond.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const seatsWithRings = game.seats.filter((s: Seat) => {
        const ringCards = s.getAllWonCards().filter((c: Card) => c.suit === "rings");
        return ringCards.length >= 1;
      }).length;

      const met = Elrond.objective.check(game, seat);
      const completable = Elrond.objective.isCompletable(game, seat);
      const completed = Elrond.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Seats with rings: ${seatsWithRings}/${game.seats.length}`,
      };
    },
  },
};
