import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveCard } from "../objectives";

export const Sam: CharacterDefinition = {
  name: "Sam",
  setupText:
    "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Merry", "Pippin"].includes(c)
    );
  },

  objective: {
    text: "Win the Hills card matching your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }
      return achieveCard(game, seat, { suit: "hills", value: seat.threatCard });
    },

    cards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
        if (game.hasCard(seat, "hills", seat.threatCard)) {
          cards.push({ suit: "hills", value: seat.threatCard });
        }
      }
      return { cards };
    },
  },
};
