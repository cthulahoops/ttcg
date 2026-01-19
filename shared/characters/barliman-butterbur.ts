import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const BarlimanButterbur: CharacterDefinition = {
  name: "Barliman Butterbur",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least one of the last three tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const met = seat.tricksWon.some((t) => t.number >= game.tricksToPlay - 3);

      // This is always completable until game ends
      // (last 3 tricks will always be played)

      if (met) {
        return { finality: "final", outcome: "success" };
      }

      if (game.finished) {
        return { finality: "final", outcome: "failure" };
      }

      return { finality: "tentative", outcome: "failure" };
    },
  },

  display: {
    getObjectiveCards: (game, seat) => {
      const tricksWon = seat.tricksWon.filter(
        (t) => t.number >= game.tricksToPlay - 3
      ).length;
      const cards: ObjectiveCard[] = Array(tricksWon).fill("trick");
      return { cards };
    },
  },
};
