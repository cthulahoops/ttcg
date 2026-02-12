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
  let ringsRemaining = 0;

  // Check each seat for ring ownership using game.hasCard
  for (const seat of game.seats) {
    let seatHasRing = false;
    for (let value = 1; value <= 5; value++) {
      if (game.hasCard(seat, "rings", value)) {
        seatHasRing = true;
      }
    }
    if (seatHasRing) {
      seatsWithRings++;
    }
  }

  // Count rings still available (not won by anyone and not the lost card)
  for (let value = 1; value <= 5; value++) {
    if (game.cardAvailable("rings", value)) {
      ringsRemaining++;
    }
  }

  const seatsNeedingRing = game.seats.length - seatsWithRings;

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

      const card = await seat.controller.selectCard(availableCards, {
        message: "Choose a card to pass to the player on your right",
        forSeat: seat.seatIndex,
        publicMessage: "choosing a card to pass right",
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

    getDetails: (game, _seat): string | undefined => {
      const seatsWithoutRings = game.seats.filter((s: Seat) => {
        for (let value = 1; value <= 5; value++) {
          if (game.hasCard(s, "rings", value)) return false;
        }
        return true;
      });

      if (seatsWithoutRings.length === 0) {
        return undefined; // All have rings - show nothing
      }

      const names = seatsWithoutRings.map(
        (s) => s.character?.name ?? `Seat ${s.seatIndex + 1}`
      );

      // Format: "Merry, Frodo, and Elrond yet to win rings"
      if (names.length === 1) {
        return `${names[0]} yet to win rings`;
      }
      const last = names.pop();
      return `${names.join(", ")}, and ${last} yet to win rings`;
    },
  },
};
