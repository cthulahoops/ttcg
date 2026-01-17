import type { ObjectiveCard } from "../types";
import type { CharacterDefinition } from "./types";

export const Aragorn: CharacterDefinition = {
  name: "Aragorn",
  setupText: "Choose a threat card, then exchange with Gimli or Legolas",

  setup: async (game, seat, setupContext) => {
    await game.chooseThreatCard(seat);
    await game.exchange(seat, setupContext, (c: string) =>
      ["Gimli", "Legolas"].includes(c)
    );
  },

  objective: {
    text: "Win exactly the number of tricks shown on your threat card",
    check: (_game, seat) => {
      if (!seat.threatCard) return false;
      return seat.getTrickCount() === seat.threatCard;
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      const target = seat.threatCard;
      const current = seat.getTrickCount();
      // Impossible if already over target
      if (current > target) return false;
      // Check if there are enough tricks remaining to reach target
      const tricksNeeded = target - current;
      return game.tricksRemaining() >= tricksNeeded;
    },
    isCompleted: (game, seat) =>
      game.finished && Aragorn.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Aragorn.objective.check(game, seat);
      const completable = Aragorn.objective.isCompletable(game, seat);
      const completed = Aragorn.objective.isCompleted(game, seat);
      return { met, completable, completed };
    },
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      cards.push(...Array(seat.getTrickCount()).fill("trick"));
      return { cards };
    },
  },
};
