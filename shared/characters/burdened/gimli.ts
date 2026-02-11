import type { ObjectiveCard, ObjectiveStatus } from "../../types";
import type { CharacterDefinition } from "../types";
import { achieveBoth, achieveCard } from "../../objectives";
import { isOneOf } from "../character-utils";

export const GimliBurdened: CharacterDefinition = {
  name: "Gimli (Burdened)",
  setupText:
    "Draw a threat card, then exchange with Legolas or Aragorn",

  setup: async (game, seat, setupContext) => {
    const exclude =
      game.lostCard &&
      (game.lostCard.suit === "mountains" || game.lostCard.suit === "shadows")
        ? game.lostCard.value
        : undefined;

    await game.drawThreatCard(seat, { exclude });
    await game.exchange(seat, setupContext, (c: string) =>
      isOneOf(c, ["Legolas", "Aragorn"])
    );
  },

  objective: {
    text: "Win both the Mountains and Shadows cards matching your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }
      return achieveBoth(
        achieveCard(game, seat, { suit: "mountains", value: seat.threatCard }),
        achieveCard(game, seat, { suit: "shadows", value: seat.threatCard })
      );
    },

    cards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        if (game.hasCard(seat, "mountains", seat.threatCard)) {
          cards.push({ suit: "mountains", value: seat.threatCard });
        }
        if (game.hasCard(seat, "shadows", seat.threatCard)) {
          cards.push({ suit: "shadows", value: seat.threatCard });
        }
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      return { cards };
    },
  },
};
