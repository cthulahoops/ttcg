import type { CharacterDefinition } from "./types";

export const Gandalf: CharacterDefinition = {
  name: "Gandalf",
  setupText: "Optionally take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.takeLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win at least one trick",
    check: (_game, seat) => seat.getTrickCount() >= 1,
    isCompletable: (_game, _seat) => true, // Always possible
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Gandalf.objective.check(game, seat);
      return game.displaySimple(met, true);
    },
  },
};
