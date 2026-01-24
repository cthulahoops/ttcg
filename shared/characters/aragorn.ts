import type { ObjectiveCard, ObjectiveStatus } from "../types";
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

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }

      const target = seat.threatCard;
      const current = seat.getTrickCount();
      const met = current === target;

      // Impossible if already over target
      if (current > target) {
        return { finality: "final", outcome: "failure" };
      }

      // Check if there are enough tricks remaining to reach target
      const tricksNeeded = target - current;
      const completable = game.tricksRemaining() >= tricksNeeded;

      // Can only be completed when game is finished
      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
      }

      if (!completable) {
        return { finality: "final", outcome: "failure" };
      }

      return {
        finality: "tentative",
        outcome: met ? "success" : "failure",
      };
    },
  },

  display: {
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
