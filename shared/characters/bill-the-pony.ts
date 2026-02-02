import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveExactly, tricksWinnable } from "../objectives";

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
      return achieveExactly(tricksWinnable(game, seat), 1);
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
