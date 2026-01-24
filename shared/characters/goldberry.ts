import type { Card, ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Goldberry: CharacterDefinition = {
  name: "Goldberry",
  setupText: "Turn your hand face-up (visible to all players)",

  setup: async (game, seat, _setupContext) => {
    game.revealHand(seat);
  },

  objective: {
    text: "Win exactly three tricks in a row and no other tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const trickNumbers = seat.tricksWon
        .map((t: { number: number; cards: Card[] }) => t.number)
        .sort((a: number, b: number) => a - b);

      const trickCount = trickNumbers.length;

      // Check if objective is met
      const met =
        trickCount === 3 &&
        trickNumbers[1] === trickNumbers[0]! + 1 &&
        trickNumbers[2] === trickNumbers[1]! + 1;

      // Check if completable
      let completable: boolean;
      if (trickCount > 3) {
        completable = false;
      } else if (trickCount === 3) {
        completable = met;
      } else if (trickCount === 0) {
        completable = game.tricksRemaining() >= 3;
      } else {
        // Check if existing tricks are consecutive
        let isConsecutive = true;
        for (let i = 1; i < trickNumbers.length; i++) {
          if (trickNumbers[i]! !== trickNumbers[i - 1]! + 1) {
            isConsecutive = false;
            break;
          }
        }

        if (!isConsecutive) {
          completable = false;
        } else {
          const maxTrickWon = trickNumbers[trickNumbers.length - 1];
          if (maxTrickWon === undefined) {
            completable = false;
          } else if (game.currentTrickNumber > maxTrickWon + 1) {
            completable = false;
          } else {
            const tricksNeeded = 3 - trickCount;
            completable = game.tricksRemaining() >= tricksNeeded;
          }
        }
      }

      // Can only be completed when game is finished
      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
      }

      if (!completable) {
        return { finality: "final", outcome: "failure" };
      }

      return {
        finality: "tentative",
        outcome: met ? "success" : "failure",
      };
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
