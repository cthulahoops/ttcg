import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveCard } from "../objectives";
import { isOneOf } from "./character-utils";
import { GimliBurdened } from "./burdened/gimli";

export const Gimli: CharacterDefinition = {
  name: "Gimli",
  burdened: GimliBurdened,
  setupText:
    "Draw a Mountains threat card, then exchange with Legolas or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      isOneOf(c, ["Legolas", "Aragorn"])
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

    cards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        if (game.hasCard(seat, "mountains", seat.threatCard)) {
          cards.push({ suit: "mountains", value: seat.threatCard });
        }
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      return { cards };
    },
  },
};
