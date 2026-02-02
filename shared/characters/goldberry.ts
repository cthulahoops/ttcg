import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import { achieveExactly, type ObjectivePossibilities } from "../objectives";

function consecutiveTricksWinnable(
  game: Game,
  seat: Seat
): ObjectivePossibilities {
  const trickNumbers = seat.tricksWon
    .map((t) => t.number)
    .sort((a, b) => a - b);

  // Check if all tricks are consecutive
  for (let i = 1; i < trickNumbers.length; i++) {
    if (trickNumbers[i] !== trickNumbers[i - 1]! + 1) {
      return { current: 0, max: 0 };
    }
  }

  const current = trickNumbers.length;
  const lastWon = trickNumbers[current - 1];
  const remaining =
    lastWon === undefined || game.currentTrickNumber <= lastWon + 1
      ? game.tricksRemaining()
      : 0;

  return { current, max: current + remaining };
}

export const Goldberry: CharacterDefinition = {
  name: "Goldberry",
  setupText: "Turn your hand face-up (visible to all players)",

  setup: async (game, seat, _setupContext) => {
    game.revealHand(seat);
  },

  objective: {
    text: "Win exactly three tricks in a row and no other tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      return achieveExactly(consecutiveTricksWinnable(game, seat), 3);
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
