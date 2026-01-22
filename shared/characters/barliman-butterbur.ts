import type { ObjectiveCard } from "../types";
import type { LegacyCharacterDefinition } from "./types";

export const BarlimanButterbur: LegacyCharacterDefinition = {
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
    isCompleted: (game, seat) =>
      game.finished && BarlimanButterbur.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = BarlimanButterbur.objective.check(game, seat);
      const completable = BarlimanButterbur.objective.isCompletable(game, seat);
      const completed = BarlimanButterbur.objective.isCompleted(game, seat);
      return { met, completable, completed };
    },
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
