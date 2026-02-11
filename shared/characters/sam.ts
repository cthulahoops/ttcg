import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveCard } from "../objectives";
import { isOneOf } from "./character-utils";
import { SamBurdened } from "./burdened/sam";

export const Sam: CharacterDefinition = {
  name: "Sam",
  burdened: SamBurdened,
  setupText:
    "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      isOneOf(c, ["Frodo", "Merry", "Pippin"])
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
        if (game.hasCard(seat, "hills", seat.threatCard)) {
          cards.push({ suit: "hills", value: seat.threatCard });
        }
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      return { cards };
    },
  },
};
