import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Merry: CharacterDefinition = {
  name: "Merry",
  setupText: "Exchange with Frodo, Pippin, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Pippin", "Sam"].includes(c)
    );
  },

  objective: {
    text: "Win exactly one or two tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const count = seat.getTrickCount();
      const met = count === 1 || count === 2;
      const completable = count < 3;

      // If game is finished, status is final
      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
      }

      // If not completable (3+ tricks), it's final failure
      if (!completable) {
        return { finality: "final", outcome: "failure" };
      }

      // Game ongoing, still completable
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
