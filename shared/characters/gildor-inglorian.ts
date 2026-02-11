import type { Card, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import { achieveAtLeast, type ObjectivePossibilities } from "../objectives";
import { isCharacter } from "./character-utils";

function forestsInFinalTrickPossible(
  game: Game,
  seat: Seat
): ObjectivePossibilities {
  if (game.finished) {
    // Game finished - check if last card played was forests
    const lastCardPlayed = seat.playedCards[seat.playedCards.length - 1];
    const achieved = lastCardPlayed?.suit === "forests" ? 1 : 0;
    return { current: achieved, max: achieved };
  }

  // Still in progress - check if player has forests cards in hand
  const availableCards = seat.hand.getAvailableCards() ?? [];
  const hasForestsInHand = availableCards.some(
    (c: Card) => c.suit === "forests"
  );

  return { current: 0, max: hasForestsInHand ? 1 : 0 };
}

export const GildorInglorian: CharacterDefinition = {
  name: "Gildor Inglorian",
  setupText: "Exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      isCharacter(c, "Frodo")
    );
  },

  objective: {
    text: "Play a forests card in final trick",

    getStatus: (game, seat): ObjectiveStatus => {
      return achieveAtLeast(forestsInFinalTrickPossible(game, seat), 1);
    },
  },
};
