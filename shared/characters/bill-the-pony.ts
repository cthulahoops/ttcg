import type { CharacterDefinition } from "./types";

export const BillThePony: CharacterDefinition = {
  name: "Bill the Pony",
  setupText: "Exchange simultaneously with Sam and Frodo",

  setup: async (game, seat, setupContext) => {
    const samExchange = await game.setupExchange(
      seat,
      setupContext,
      (c) => c === "Sam",
    );
    const frodoExchange = await game.setupExchange(
      seat,
      setupContext,
      (c) => c === "Frodo",
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
    check: (_game, seat) => seat.getTrickCount() === 1,
    isCompletable: (_game, seat) => seat.getTrickCount() <= 1,
    isCompleted: (game, seat) =>
      game.finished && BillThePony.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = BillThePony.objective.check(game, seat);
      const completable = BillThePony.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};
