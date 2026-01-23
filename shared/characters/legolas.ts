import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Legolas: CharacterDefinition = {
  name: "Legolas",
  setupText: "Draw a Forests threat card, then exchange with Gimli or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Gimli", "Aragorn"].includes(c)
    );
  },

  objective: {
    text: "Win the Forests card matching your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }
      const hasCard = game.hasCard(seat, "forests", seat.threatCard);
      const cardGone = game.cardGone(seat, "forests", seat.threatCard);

      if (hasCard) {
        return { finality: "final", outcome: "success" };
      } else if (cardGone) {
        return { finality: "final", outcome: "failure" };
      } else {
        return { finality: "tentative", outcome: "failure" };
      }
    },
  },

  display: {
    getObjectiveCards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
        if (game.hasCard(seat, "forests", seat.threatCard)) {
          cards.push({ suit: "forests", value: seat.threatCard });
        }
      }
      return { cards };
    },
  },
};
