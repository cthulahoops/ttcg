import type { ObjectiveCard, LegacyObjectiveStatus } from "../types";
import type { NewCharacterDefinition } from "./types";

export const Sam: NewCharacterDefinition = {
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

    getStatus: (game, seat): LegacyObjectiveStatus => {
      if (!seat.threatCard) {
        return ["tentative", "failure"];
      }
      const hasCard = game.hasCard(seat, "hills", seat.threatCard);
      const cardGone = game.cardGone(seat, "hills", seat.threatCard);

      if (hasCard) {
        return ["final", "success"];
      } else if (cardGone) {
        return ["final", "failure"];
      } else {
        return ["tentative", "failure"];
      }
    },
  },

  display: {
    getObjectiveCards: (game, seat) => {
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
