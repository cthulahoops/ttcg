import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveCard } from "../objectives";
import { isOneOf } from "./character-utils";
import { LegolasBurdened } from "./burdened/legolas";

export const Legolas: CharacterDefinition = {
  name: "Legolas",
  burdened: LegolasBurdened,
  drawsThreatCard: true,
  setupText: "Draw a Forests threat card, then exchange with Gimli or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      isOneOf(c, ["Gimli", "Aragorn"])
    );
  },

  objective: {
    text: "Win the Forests card matching your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }
      return achieveCard(game, seat, {
        suit: "forests",
        value: seat.threatCard,
      });
    },

    cards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        if (game.hasCard(seat, "forests", seat.threatCard)) {
          cards.push({ suit: "forests", value: seat.threatCard });
        }
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      return { cards };
    },
  },
};
