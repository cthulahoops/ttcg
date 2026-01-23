import type { ObjectiveCard } from "../types";
import type { LegacyCharacterDefinition } from "./types";

export const Merry: LegacyCharacterDefinition = {
  name: "Merry",
  setupText: "Exchange with Frodo, Pippin, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Pippin", "Sam"].includes(c)
    );
  },

  objective: {
    text: "Win exactly one or two tricks",
    check: (_game, seat) => {
      const count = seat.getTrickCount();
      return count === 1 || count === 2;
    },
    isCompletable: (_game, seat) => seat.getTrickCount() < 3,
    isCompleted: (game, seat) =>
      game.finished && Merry.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Merry.objective.check(game, seat);
      const completable = Merry.objective.isCompletable(game, seat);
      const completed = Merry.objective.isCompleted(game, seat);
      return { met, completable, completed };
    },
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
