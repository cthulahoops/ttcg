import type { Card, ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { Game } from "../game";
import type { CharacterDefinition } from "./types";
import { achieveAtLeast, cardsWinnable } from "../objectives";
import { isCharacter } from "./character-utils";

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
      const frodoRings = cardsWinnable(game, seat, (c) => c.suit === "rings");

      // Sam (Burdened)'s rings count toward Frodo's goal.
      // current is additive (won cards are disjoint), but max shares the
      // same pool of remaining ring cards so we must not double-count.
      const burdenedSamSeat = game.seats.find(
        (s) =>
          s.character &&
          isCharacter(s.character.name, "Sam") &&
          s.character.name !== "Sam"
      );
      let rings = frodoRings;
      if (burdenedSamSeat) {
        const samRings = cardsWinnable(
          game,
          burdenedSamSeat,
          (c) => c.suit === "rings"
        );
        rings = {
          current: frodoRings.current + samRings.current,
          max:
            frodoRings.current +
            samRings.current +
            (frodoRings.max - frodoRings.current),
        };
      }

      return achieveAtLeast(rings, ringsNeeded);
    },

    cards: (game, seat) => {
      const ringCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "rings")
        .sort((a, b) => a.value - b.value);

      // Include Sam (Burdened)'s rings in the display
      const burdenedSamSeat = game.seats.find(
        (s) =>
          s.character &&
          isCharacter(s.character.name, "Sam") &&
          s.character.name !== "Sam"
      );
      if (burdenedSamSeat) {
        const samRings = burdenedSamSeat
          .getAllWonCards()
          .filter((c: Card) => c.suit === "rings")
          .sort((a, b) => a.value - b.value);
        ringCards.push(...samRings);
      }

      return { cards: ringCards };
    },
  },
};
