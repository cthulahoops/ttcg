import type { Card } from "../types";
import type { CharacterDefinition } from "./types";

export const Goldberry: CharacterDefinition = {
  name: "Goldberry",
  setupText: "Turn your hand face-up (visible to all players)",

  setup: async (game, seat, _setupContext) => {
    game.revealHand(seat);
  },

  objective: {
    text: "Win exactly three tricks in a row and no other tricks",
    check: (_game, seat) => {
      const trickNumbers = seat.tricksWon
        .map((t: { number: number; cards: Card[] }) => t.number)
        .sort((a: number, b: number) => a - b);

      if (trickNumbers.length !== 3) return false;

      return (
        trickNumbers[1] === trickNumbers[0]! + 1 &&
        trickNumbers[2] === trickNumbers[1]! + 1
      );
    },
    isCompletable: (game, seat) => {
      const trickCount = seat.getTrickCount();

      if (trickCount > 3) return false;

      if (trickCount === 3) {
        return Goldberry.objective.check(game, seat);
      }

      if (trickCount === 0) {
        return game.tricksRemaining() >= 3;
      }

      const trickNumbers = seat.tricksWon
        .map((t: { number: number; cards: Card[] }) => t.number)
        .sort((a: number, b: number) => a - b);

      for (let i = 1; i < trickNumbers.length; i++) {
        if (trickNumbers[i]! !== trickNumbers[i - 1]! + 1) {
          return false;
        }
      }

      const maxTrickWon = trickNumbers[trickNumbers.length - 1];
      if (maxTrickWon === undefined) return false;

      if (game.currentTrickNumber > maxTrickWon + 1) {
        return false;
      }

      const tricksNeeded = 3 - trickCount;
      return game.tricksRemaining() >= tricksNeeded;
    },
    isCompleted: (game, seat) =>
      game.finished && Goldberry.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Goldberry.objective.check(game, seat);
      const completable = Goldberry.objective.isCompletable(game, seat);
      const completed = Goldberry.objective.isCompleted(game, seat);
      return { met, completable, completed };
    },
  },
};
