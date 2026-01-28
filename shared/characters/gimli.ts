import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveCard } from "../objectives";

export const Gimli: CharacterDefinition = {
  name: "Gimli",
  setupText:
    "Draw a Mountains threat card, then exchange with Legolas or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Legolas", "Aragorn"].includes(c)
    );
  },

  objective: {
    text: "Win the Mountains card matching your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }
      return achieveCard(game, seat, {
        suit: "mountains",
        value: seat.threatCard,
      });
    },
  },

  display: {
    getObjectiveCards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
        if (game.hasCard(seat, "mountains", seat.threatCard)) {
          cards.push({ suit: "mountains", value: seat.threatCard });
        }
      }
      return { cards };
    },
  },
};
