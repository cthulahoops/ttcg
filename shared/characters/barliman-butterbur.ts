import type { CharacterDefinition } from "./types";

export const BarlimanButterbur: CharacterDefinition = {
  name: "Barliman Butterbur",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least one of the last three tricks",
    check: (game, seat) => {
      return seat.tricksWon.some((t) => t.number >= game.tricksToPlay - 3);
    },
    isCompletable: () => {
      return true;
    },
    isCompleted: (game, seat) => game.finished && BarlimanButterbur.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = BarlimanButterbur.objective.check(game, seat);
      const completable = BarlimanButterbur.objective.isCompletable(game, seat);
      const completed = BarlimanButterbur.objective.isCompleted(game, seat);
      return game.displaySimple(met, completable, completed);
    },
  },
};
