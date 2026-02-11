import type { ObjectiveCard, ObjectiveStatus } from "../../types";
import type { CharacterDefinition } from "../types";
import { achieveBoth, achieveCard } from "../../objectives";

export const SamBurdened: CharacterDefinition = {
  name: "Sam (Burdened)",
  setupText: "Draw a threat card (no exchange)",

  setup: async (game, seat) => {
    // Exclude the lost card's value if the lost card is Hills or Shadows,
    // since matching both suits requires the value to exist in both
    const exclude =
      game.lostCard &&
      (game.lostCard.suit === "hills" || game.lostCard.suit === "shadows")
        ? game.lostCard.value
        : undefined;

    await game.drawThreatCard(seat, { exclude });
  },

  objective: {
    text: "Win both the Hills and Shadows cards matching your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }
      return achieveBoth(
        achieveCard(game, seat, { suit: "hills", value: seat.threatCard }),
        achieveCard(game, seat, { suit: "shadows", value: seat.threatCard })
      );
    },

    cards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        if (game.hasCard(seat, "hills", seat.threatCard)) {
          cards.push({ suit: "hills", value: seat.threatCard });
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
