import type { Card, ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { Game } from "../game";
import type { CharacterDefinition } from "./types";
import { achieveAtLeast, type ObjectivePossibilities } from "../objectives";

/**
 * Counts how many seats can potentially win at least one ring card.
 * Unlike per-seat cardsWinnable, this accounts for the shared resource constraint:
 * if there are fewer rings remaining than seats needing them, not all can succeed.
 */
function seatsWithRingsWinnable(game: Game): ObjectivePossibilities {
  let seatsWithRings = 0;
  let seatsNeedingRing = 0;
  let totalRingsWon = 0;

  for (const seat of game.seats) {
    const ringCount = seat
      .getAllWonCards()
      .filter((c: Card) => c.suit === "rings").length;
    if (ringCount > 0) {
      seatsWithRings++;
      totalRingsWon += ringCount;
    } else {
      seatsNeedingRing++;
    }
  }

  const ringsRemaining = 5 - totalRingsWon;

  return {
    current: seatsWithRings,
    max: seatsWithRings + Math.min(seatsNeedingRing, ringsRemaining),
  };
}

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
      const possibilities = seatsWithRingsWinnable(game);
      return achieveAtLeast(possibilities, game.seats.length);
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
