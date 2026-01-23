import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const BillThePony: CharacterDefinition = {
  name: "Bill the Pony",
  setupText: "Exchange simultaneously with Sam and Frodo",

  setup: async (game, seat, setupContext) => {
    const samExchange = await game.setupExchange(
      seat,
      setupContext,
      (c) => c === "Sam"
    );
    const frodoExchange = await game.setupExchange(
      seat,
      setupContext,
      (c) => c === "Frodo"
    );

    if (samExchange) {
      game.completeExchange(samExchange, setupContext);
    }

    if (frodoExchange) {
      game.completeExchange(frodoExchange, setupContext);
    }

    if (samExchange || frodoExchange) {
      game.refreshDisplay();
    }
  },

  objective: {
    text: "Win exactly one trick",

    getStatus: (game, seat): ObjectiveStatus => {
      const trickCount = seat.getTrickCount();
      const met = trickCount === 1;

      // Cannot complete if already have more than 1 trick
      if (trickCount > 1) {
        return { finality: "final", outcome: "failure" };
      }

      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
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
