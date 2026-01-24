import type { Card, ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { Game } from "../game";
import type { CharacterDefinition } from "./types";

/**
 * Calculate how many rings Frodo needs to win.
 * In 3-player mode and solo mode, Frodo normally needs 4 rings.
 * However, if Elrond is in the game (requiring all players to win a ring),
 * Frodo only needs 2 rings to make the combined objectives achievable.
 */
function getRingsNeeded(game: Game): number {
  // Check if Elrond is in play
  const elrondInPlay = game.seats.some(
    (s: Seat) => s.character?.name === "Elrond"
  );

  // With Elrond in play, reduce to 2 (otherwise 4 + 3 players needing rings = impossible)
  if (elrondInPlay) {
    return 2;
  }

  // Solo mode (1 player controls all 4 seats) uses the harder 4-ring requirement
  const isSoloMode = game.playerCount === 1;

  // Standard: 3-player and solo need 4, all others need 2
  return game.numCharacters === 3 || isSoloMode ? 4 : 2;
}

export const Frodo: CharacterDefinition = {
  name: "Frodo",
  setupText: "No setup action",

  setup: async (_game, _seat, _setupContext) => {},

  objective: {
    getText: (game) => {
      const needed = getRingsNeeded(game);
      const neededText = needed === 4 ? "four" : "two";
      return `Win at least ${neededText} ring cards`;
    },

    getStatus: (game, seat): ObjectiveStatus => {
      const ringsNeeded = getRingsNeeded(game);
      const myRings = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "rings").length;

      const met = myRings >= ringsNeeded;

      const othersRings = game.seats.reduce((total: number, s: Seat) => {
        if (s.seatIndex !== seat.seatIndex) {
          return (
            total +
            s.getAllWonCards().filter((c: Card) => c.suit === "rings").length
          );
        }
        return total;
      }, 0);
      const ringsRemaining = 5 - myRings - othersRings;
      const completable = myRings + ringsRemaining >= ringsNeeded;

      if (met) {
        return { finality: "final", outcome: "success" };
      } else if (!completable) {
        return { finality: "final", outcome: "failure" };
      } else {
        return { finality: "tentative", outcome: "failure" };
      }
    },

    getDetails: (_game, seat): string => {
      const ringCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "rings");

      if (ringCards.length > 0) {
        const ringList = ringCards
          .map((c) => c.value)
          .sort((a: number, b: number) => a - b)
          .join(", ");
        return `Rings: ${ringList}`;
      }
      return "Rings: none";
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const ringCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "rings")
        .sort((a, b) => a.value - b.value);
      return { cards: ringCards };
    },
  },
};
