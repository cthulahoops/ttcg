import type { ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Boromir: CharacterDefinition = {
  name: "Boromir",
  setupText: "Exchange with anyone except Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c !== "Frodo");
  },

  objective: {
    text: "Win the last trick; do NOT win the 1 of Rings",

    getStatus: (game, seat): ObjectiveStatus => {
      const wonLast = game.lastTrickWinner === seat.seatIndex;
      const hasOneRing = game.hasCard(seat, "rings", 1);
      const met = wonLast && !hasOneRing;

      // Cannot complete if already has the 1 of Rings
      if (hasOneRing) {
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

    getDetails: (game, seat): string => {
      const wonLast = game.lastTrickWinner === seat.seatIndex;
      const hasOneRing = game.hasCard(seat, "rings", 1);

      const lastIcon = wonLast ? "yes" : "no";
      const oneRingIcon = hasOneRing ? "has 1-Ring" : "ok";
      return `Last: ${lastIcon}, 1-Ring: ${oneRingIcon}`;
    },
  },

  display: {},
};
